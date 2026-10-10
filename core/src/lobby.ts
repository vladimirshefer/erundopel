const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ROOM_CODE_LENGTH = 6
const MAX_NAME_LENGTH = 32
const MAX_PLAYERS = 100
const MAX_ACTIVE_LOBBIES = 500

export type PlayerCredentials = Readonly<{ playerId: string }>
export type LobbyPlayer = Readonly<{
  id: string
  name: string
  connected: boolean
  answered: boolean
  voted: boolean
  score: number
}>
export type TextAnswer = Readonly<{ text: string }>
export type GamePhase = 'lobby' | 'answering' | 'voting' | 'results'
export type Task = Readonly<{ text: string; correctAnswer: TextAnswer }>
export type PublicTask = Readonly<Pick<Task, 'text'>>
export type AnswerOption = Readonly<{ id: string; text: string }>
export type GameStateSnapshot = Readonly<{
  code: string
  ownerPlayerId: string
  createdAt: number
  revision: number
  closed: boolean
  phase: GamePhase
  task?: PublicTask
  answerOptions?: readonly AnswerOption[]
  correctAnswerId?: string
  players: readonly LobbyPlayer[]
  spectators: readonly LobbyPlayer[]
}>
export type CreateLobbyInput = Readonly<{ playerName: string }>
export type LobbyCommand =
  | Readonly<{ type: 'view' }>
  | Readonly<{ type: 'spectate'; playerName: string }>
  | Readonly<{ type: 'join'; playerName: string; playerId?: string }>
  | Readonly<{ type: 'reconnect'; playerId: string }>
  | Readonly<{ type: 'disconnect'; playerId: string }>
  | Readonly<{ type: 'leave'; playerId: string }>
  | Readonly<{ type: 'close'; playerId: string }>
  | Readonly<{ type: 'startTask'; playerId: string; task: Task }>
  | Readonly<{ type: 'submitAnswer'; playerId: string; answer: TextAnswer }>
  | Readonly<{ type: 'vote'; playerId: string; answerId: string }>
  | Readonly<{ type: 'nextTask'; playerId: string; task: Task }>
export type LobbyCommandResult = Readonly<{
  state: GameStateSnapshot
  credentials?: PlayerCredentials
  evictedCode?: string
}>

type PlayerRecord = { id: string; name: string; connected: boolean; playing: boolean; score: number }
type AnswerRecord = AnswerOption & { playerId?: string }

export class LobbyError extends Error {
  constructor(
    readonly code:
      | 'LOBBY_CLOSED'
      | 'LOBBY_FULL'
      | 'LOBBY_NOT_FOUND'
      | 'PLAYER_NOT_FOUND'
      | 'INVALID_NAME'
      | 'NAME_TAKEN'
      | 'FORBIDDEN'
      | 'INVALID_GAME_PHASE'
      | 'ANSWER_ALREADY_SUBMITTED'
      | 'INVALID_ANSWER'
      | 'ALREADY_VOTED'
      | 'INVALID_ANSWER_OPTION'
      | 'VOTE_FOR_OWN_ANSWER',
    message: string,
  ) {
    super(message)
  }
}

export class GameState {
  readonly #players = new Map<string, PlayerRecord>()
  readonly #answers = new Map<string, AnswerRecord>()
  readonly #votes = new Map<string, string>()
  #closed = false
  #revision = 0
  #phase: GamePhase = 'lobby'
  #task?: Task
  #answerOptions: AnswerRecord[] = []

  private constructor(
    readonly code: string,
    readonly ownerPlayerId: string,
    readonly createdAt: number,
    public lastActiveAt = createdAt,
  ) {}

  static create(code: string, playerName: string, now = Date.now()): { gameState: GameState; credentials: PlayerCredentials } {
    const owner = createPlayer(playerName)
    const gameState = new GameState(code, owner.id, now)
    gameState.#players.set(owner.id, owner)
    return { gameState, credentials: credentialsFor(owner) }
  }

  execute(command: LobbyCommand): LobbyCommandResult {
    switch (command.type) {
      case 'view': return this.#view()
      case 'spectate': return this.#spectate(command.playerName)
      case 'join': return this.#join(command.playerName, command.playerId)
      case 'reconnect': return this.#reconnect(command.playerId)
      case 'disconnect': return this.#setConnected(command.playerId, false)
      case 'leave': return this.#leave(command.playerId)
      case 'close': return this.#close(command.playerId)
      case 'startTask': return this.#startTask(command.playerId, command.task)
      case 'submitAnswer': return this.#submitAnswer(command.playerId, command.answer)
      case 'vote': return this.#vote(command.playerId, command.answerId)
      case 'nextTask': return this.#nextTask(command.playerId, command.task)
    }
  }

  snapshot(): GameStateSnapshot {
    this.lastActiveAt = Math.max(Date.now(), this.lastActiveAt + 1)
    const people = [...this.#players.values()].map(({ id, name, connected, playing, score }) => ({
      id, name, connected, playing, score, answered: this.#answers.has(id), voted: this.#votes.has(id),
    }))
    return {
      code: this.code,
      ownerPlayerId: this.ownerPlayerId,
      createdAt: this.createdAt,
      revision: this.#revision,
      closed: this.#closed,
      phase: this.#phase,
      task: this.#task && { text: this.#task.text },
      answerOptions: this.#answerOptions.map(({ id, text }) => ({ id, text })),
      correctAnswerId: this.#phase === 'results' ? 'correct' : undefined,
      players: people.filter((player) => player.playing).map(({ playing: _, ...player }) => player),
      spectators: people.filter((player) => !player.playing).map(({ playing: _, ...player }) => player),
    }
  }

  #assertOpen(): void {
    if (this.#closed) throw new LobbyError('LOBBY_CLOSED', 'This lobby is closed.')
  }

  #findPlayer(playerId: string): PlayerRecord {
    const player = this.#players.get(playerId)
    if (!player) throw new LobbyError('PLAYER_NOT_FOUND', 'Player was not found in this lobby.')
    return player
  }

  #assertOwner(playerId: string): void {
    if (playerId !== this.ownerPlayerId) throw new LobbyError('FORBIDDEN', 'Only the lobby creator can do this.')
  }

  #setConnected(playerId: string, connected: boolean): LobbyCommandResult {
    this.#assertOpen()
    const player = this.#findPlayer(playerId)
    if (player.connected !== connected) {
      player.connected = connected
      this.#revision += 1
    }
    return { state: this.snapshot() }
  }

  #join(playerName: string, playerId?: string): LobbyCommandResult {
    this.#assertOpen()
    if (this.#phase !== 'lobby') throw new LobbyError('INVALID_GAME_PHASE', 'The game has already started.')
    const name = normalizeName(playerName)
    if (!playerId && this.#players.size >= MAX_PLAYERS) throw new LobbyError('LOBBY_FULL', 'The lobby already has the maximum of 100 players.')
    const player = playerId ? this.#findPlayer(playerId) : createPlayer(name)
    if ([...this.#players.values()].some((existingPlayer) => existingPlayer.id !== player.id && existingPlayer.name.localeCompare(name, undefined, { sensitivity: 'accent' }) === 0)) {
      throw new LobbyError('NAME_TAKEN', 'A player with this name is already in the lobby.')
    }
    player.name = name
    player.connected = true
    player.playing = true
    if (!playerId) this.#players.set(player.id, player)
    this.#revision += 1
    return { state: this.snapshot(), credentials: credentialsFor(player) }
  }

  #view(): LobbyCommandResult {
    this.#assertOpen()
    return { state: this.snapshot() }
  }

  #spectate(playerName: string): LobbyCommandResult {
    this.#assertOpen()
    if (this.#players.size >= MAX_PLAYERS) throw new LobbyError('LOBBY_FULL', 'The lobby already has the maximum of 100 players.')
    const player = createPlayer(playerName, false)
    if ([...this.#players.values()].some((existingPlayer) => existingPlayer.name.localeCompare(player.name, undefined, { sensitivity: 'accent' }) === 0)) {
      throw new LobbyError('NAME_TAKEN', 'A player with this name is already in the lobby.')
    }
    player.connected = true
    this.#players.set(player.id, player)
    this.#revision += 1
    return { state: this.snapshot(), credentials: credentialsFor(player) }
  }

  #reconnect(playerId: string): LobbyCommandResult {
    this.#findPlayer(playerId)
    return this.#setConnected(playerId, true)
  }

  #leave(playerId: string): LobbyCommandResult {
    this.#assertOpen()
    this.#findPlayer(playerId)
    this.#players.delete(playerId)
    this.#completeAnswering()
    this.#completeVoting()
    this.#revision += 1
    return { state: this.snapshot() }
  }

  #close(playerId: string): LobbyCommandResult {
    this.#assertOpen()
    this.#assertOwner(playerId)
    this.#closed = true
    this.#revision += 1
    return { state: this.snapshot() }
  }

  #startTask(playerId: string, task: Task): LobbyCommandResult {
    this.#assertOpen()
    this.#assertOwner(playerId)
    if (this.#phase !== 'lobby') throw new LobbyError('INVALID_GAME_PHASE', 'A task has already been started.')
    return this.#beginTask(task)
  }

  #nextTask(playerId: string, task: Task): LobbyCommandResult {
    this.#assertOpen()
    this.#assertOwner(playerId)
    if (this.#phase !== 'results') throw new LobbyError('INVALID_GAME_PHASE', 'Show the results first.')
    return this.#beginTask(task)
  }

  #beginTask(task: Task): LobbyCommandResult {
    if (!task || typeof task.text !== 'string' || !task.text.trim()) {
      throw new LobbyError('INVALID_ANSWER', 'Task text must not be empty.')
    }
    this.#task = {
      text: task.text.trim(),
      correctAnswer: normalizeAnswer(task.correctAnswer),
    }
    this.#answers.clear()
    this.#votes.clear()
    this.#answerOptions = []
    this.#phase = 'answering'
    this.#revision += 1
    return { state: this.snapshot() }
  }

  #submitAnswer(playerId: string, answer: TextAnswer): LobbyCommandResult {
    this.#assertOpen()
    if (this.#phase !== 'answering') throw new LobbyError('INVALID_GAME_PHASE', 'Answers are not accepted now.')
    this.#findPlayer(playerId)
    if (this.#answers.has(playerId)) throw new LobbyError('ANSWER_ALREADY_SUBMITTED', 'This player has already submitted an answer.')
    this.#answers.set(playerId, { id: crypto.randomUUID(), text: normalizeAnswer(answer).text, playerId })
    this.#completeAnswering()
    this.#revision += 1
    return { state: this.snapshot() }
  }

  #completeAnswering(): void {
    if (this.#phase !== 'answering' || ![...this.#players.values()].filter((player) => player.playing).every((player) => this.#answers.has(player.id))) return
    this.#answerOptions = shuffle([{ id: 'correct', text: this.#task!.correctAnswer.text }, ...this.#answers.values()])
    this.#phase = 'voting'
  }

  #vote(playerId: string, answerId: string): LobbyCommandResult {
    this.#assertOpen()
    if (this.#phase !== 'voting') throw new LobbyError('INVALID_GAME_PHASE', 'Voting is not open now.')
    this.#findPlayer(playerId)
    if (this.#votes.has(playerId)) throw new LobbyError('ALREADY_VOTED', 'This player has already voted.')
    const answer = this.#answerOptions.find((option) => option.id === answerId)
    if (!answer) throw new LobbyError('INVALID_ANSWER_OPTION', 'This answer option does not exist.')
    if (answer.playerId === playerId) throw new LobbyError('VOTE_FOR_OWN_ANSWER', 'You cannot vote for your own answer.')
    this.#votes.set(playerId, answerId)
    this.#completeVoting()
    this.#revision += 1
    return { state: this.snapshot() }
  }

  #completeVoting(): void {
    if (this.#phase !== 'voting' || ![...this.#players.values()].filter((player) => player.playing).every((player) => this.#votes.has(player.id))) return
    for (const [playerId, answerId] of this.#votes) {
      const answer = this.#answerOptions.find((option) => option.id === answerId)!
      if (answer.id === 'correct') this.#findPlayer(playerId).score += 2
      if (answer.playerId) this.#findPlayer(answer.playerId).score += 1
    }
    this.#phase = 'results'
  }
}

export class LobbyManager {
  readonly #lobbies = new Map<string, GameState>()

  createLobby(input: CreateLobbyInput): LobbyCommandResult {
    let leastRecentlyActive: GameState | undefined
    if (this.#lobbies.size >= MAX_ACTIVE_LOBBIES) {
      for (const lobby of this.#lobbies.values()) {
        if (!leastRecentlyActive || lobby.lastActiveAt < leastRecentlyActive.lastActiveAt) {
          leastRecentlyActive = lobby
        }
      }
    }
    const evictedCode = leastRecentlyActive?.code
    if (evictedCode) this.#lobbies.delete(evictedCode)
    const code = this.#createCode()
    const { gameState, credentials } = GameState.create(code, input.playerName)
    this.#lobbies.set(code, gameState)
    return { state: gameState.snapshot(), credentials, evictedCode }
  }

  execute(code: string, command: LobbyCommand): LobbyCommandResult {
    return this.getGameState(code).execute(command)
  }

  getSnapshot(code: string): GameStateSnapshot {
    return this.getGameState(code).snapshot()
  }

  getGameState(code: string): GameState {
    const gameState = this.#lobbies.get(normalizeCode(code))
    if (!gameState) throw new LobbyError('LOBBY_NOT_FOUND', 'Lobby was not found.')
    return gameState
  }

  #createCode(): string {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = createRoomCode()
      if (!this.#lobbies.has(code)) return code
    }
    throw new Error('Could not allocate a unique lobby code.')
  }
}

function normalizeName(value: string): string {
  const name = value.trim()
  if (!name || name.length > MAX_NAME_LENGTH) throw new LobbyError('INVALID_NAME', `Player name must contain 1 to ${MAX_NAME_LENGTH} characters.`)
  return name
}

function normalizeCode(value: string): string { return value.trim().toUpperCase() }

function createPlayer(name: string, playing = true): PlayerRecord {
  return { id: crypto.randomUUID(), name: normalizeName(name), connected: false, playing, score: 0 }
}

function credentialsFor(player: PlayerRecord): PlayerCredentials { return { playerId: player.id } }

function createRoomCode(): string {
  const randomValues = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH))
  return [...randomValues].map((value) => ROOM_ALPHABET[value % ROOM_ALPHABET.length]).join('')
}

function normalizeAnswer(answer: TextAnswer): TextAnswer {
  if (!answer || typeof answer.text !== 'string' || !answer.text.trim()) throw new LobbyError('INVALID_ANSWER', 'Answer text must not be empty.')
  return { text: answer.text.trim() }
}

function shuffle<T>(values: T[]): T[] { return values.sort(() => Math.random() - 0.5) }
