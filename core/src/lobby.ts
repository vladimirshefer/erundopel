import tasks from './tasks.json'

const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ROOM_CODE_LENGTH = 6
const MAX_NAME_LENGTH = 32

export type PlayerCredentials = Readonly<{ playerId: string; resumeToken: string }>
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
export type Task = Readonly<{ id: string; text: string; correctAnswer: TextAnswer }>
export type PublicTask = Readonly<Pick<Task, 'id' | 'text'>>
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
}>
export type CreateLobbyInput = Readonly<{ playerName: string }>
export type LobbyCommand =
  | Readonly<{ type: 'join'; playerName: string }>
  | Readonly<{ type: 'reconnect'; playerId: string; resumeToken: string }>
  | Readonly<{ type: 'disconnect'; playerId: string }>
  | Readonly<{ type: 'leave'; playerId: string }>
  | Readonly<{ type: 'close'; playerId: string }>
  | Readonly<{ type: 'startTask'; playerId: string }>
  | Readonly<{ type: 'submitAnswer'; playerId: string; answer: TextAnswer }>
  | Readonly<{ type: 'vote'; playerId: string; answerId: string }>
  | Readonly<{ type: 'nextTask'; playerId: string }>
export type LobbyCommandResult = Readonly<{ state: GameStateSnapshot; credentials?: PlayerCredentials }>

type PlayerRecord = { id: string; name: string; resumeToken: string; connected: boolean; score: number }
type AnswerRecord = AnswerOption & { playerId?: string }

export class LobbyError extends Error {
  constructor(
    readonly code:
      | 'LOBBY_CLOSED'
      | 'LOBBY_NOT_FOUND'
      | 'PLAYER_NOT_FOUND'
      | 'INVALID_NAME'
      | 'NAME_TAKEN'
      | 'INVALID_CREDENTIALS'
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

  private constructor(readonly code: string, readonly ownerPlayerId: string, readonly createdAt: number) {}

  static create(code: string, playerName: string, now = Date.now()): { gameState: GameState; credentials: PlayerCredentials } {
    const owner = createPlayer(playerName)
    const gameState = new GameState(code, owner.id, now)
    gameState.#players.set(owner.id, owner)
    return { gameState, credentials: credentialsFor(owner) }
  }

  execute(command: LobbyCommand): LobbyCommandResult {
    switch (command.type) {
      case 'join': return this.#join(command.playerName)
      case 'reconnect': return this.#reconnect(command.playerId, command.resumeToken)
      case 'disconnect': return this.#setConnected(command.playerId, false)
      case 'leave': return this.#leave(command.playerId)
      case 'close': return this.#close(command.playerId)
      case 'startTask': return this.#startTask(command.playerId)
      case 'submitAnswer': return this.#submitAnswer(command.playerId, command.answer)
      case 'vote': return this.#vote(command.playerId, command.answerId)
      case 'nextTask': return this.#nextTask(command.playerId)
    }
  }

  snapshot(): GameStateSnapshot {
    return {
      code: this.code,
      ownerPlayerId: this.ownerPlayerId,
      createdAt: this.createdAt,
      revision: this.#revision,
      closed: this.#closed,
      phase: this.#phase,
      task: this.#task && { id: this.#task.id, text: this.#task.text },
      answerOptions: this.#answerOptions.map(({ id, text }) => ({ id, text })),
      correctAnswerId: this.#phase === 'results' ? 'correct' : undefined,
      players: [...this.#players.values()].map(({ id, name, connected, score }) => ({
        id, name, connected, score, answered: this.#answers.has(id), voted: this.#votes.has(id),
      })),
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

  #join(playerName: string): LobbyCommandResult {
    this.#assertOpen()
    if (this.#phase !== 'lobby') throw new LobbyError('INVALID_GAME_PHASE', 'The game has already started.')
    const name = normalizeName(playerName)
    if ([...this.#players.values()].some((player) => player.name.localeCompare(name, undefined, { sensitivity: 'accent' }) === 0)) {
      throw new LobbyError('NAME_TAKEN', 'A player with this name is already in the lobby.')
    }
    const player = createPlayer(name)
    this.#players.set(player.id, player)
    this.#revision += 1
    return { state: this.snapshot(), credentials: credentialsFor(player) }
  }

  #reconnect(playerId: string, resumeToken: string): LobbyCommandResult {
    const player = this.#findPlayer(playerId)
    if (player.resumeToken !== resumeToken) throw new LobbyError('INVALID_CREDENTIALS', 'The reconnect token is invalid.')
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

  #startTask(playerId: string): LobbyCommandResult {
    this.#assertOpen()
    this.#assertOwner(playerId)
    if (this.#phase !== 'lobby') throw new LobbyError('INVALID_GAME_PHASE', 'A task has already been started.')
    return this.#beginTask()
  }

  #nextTask(playerId: string): LobbyCommandResult {
    this.#assertOpen()
    this.#assertOwner(playerId)
    if (this.#phase !== 'results') throw new LobbyError('INVALID_GAME_PHASE', 'Show the results first.')
    return this.#beginTask()
  }

  #beginTask(): LobbyCommandResult {
    this.#task = tasks[Math.floor(Math.random() * tasks.length)]
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
    if (this.#phase !== 'answering' || ![...this.#players.keys()].every((playerId) => this.#answers.has(playerId))) return
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
    if (this.#phase !== 'voting' || ![...this.#players.keys()].every((playerId) => this.#votes.has(playerId))) return
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
    const code = this.#createCode()
    const { gameState, credentials } = GameState.create(code, input.playerName)
    this.#lobbies.set(code, gameState)
    return { state: gameState.snapshot(), credentials }
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

function createPlayer(name: string): PlayerRecord {
  return { id: crypto.randomUUID(), name: normalizeName(name), resumeToken: crypto.randomUUID(), connected: false, score: 0 }
}

function credentialsFor(player: PlayerRecord): PlayerCredentials { return { playerId: player.id, resumeToken: player.resumeToken } }

function createRoomCode(): string {
  const randomValues = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH))
  return [...randomValues].map((value) => ROOM_ALPHABET[value % ROOM_ALPHABET.length]).join('')
}

function normalizeAnswer(answer: TextAnswer): TextAnswer {
  if (!answer || typeof answer.text !== 'string' || !answer.text.trim()) throw new LobbyError('INVALID_ANSWER', 'Answer text must not be empty.')
  return { text: answer.text.trim() }
}

function shuffle<T>(values: T[]): T[] { return values.sort(() => Math.random() - 0.5) }
