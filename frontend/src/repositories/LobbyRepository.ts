export type LobbyPlayer = {
  id: string
  name: string
  connected: boolean
  answered: boolean
  voted: boolean
  score: number
}

export type AnswerOption = { id: string; text: string }

export type LobbyState = {
  code: string
  ownerPlayerId: string
  phase: 'lobby' | 'answering' | 'voting' | 'results'
  players: LobbyPlayer[]
  task?: { text: string; correctAnswer?: string }
  answerOptions?: AnswerOption[]
  correctAnswerId?: string
}

export type PlayerSession = { playerId: string }

type LobbyResponse = {
  type: 'joined' | 'resumed' | 'state'
  state: LobbyState
  credentials?: PlayerSession
}

type LobbyConnection = {
  socket: WebSocket
  state: LobbyState
  credentials?: PlayerSession
}

export interface LobbyRepository {
  createLobby(
    playerName: string,
  ): Promise<{ state: LobbyState; credentials: PlayerSession }>
  joinLobby(
    code: string,
    playerName: string,
    onState: (state: LobbyState) => void,
  ): Promise<LobbyConnection>
  reconnect(code: string, playerId: string, onState: (state: LobbyState) => void): Promise<LobbyConnection>
  startGame(socket: WebSocket): void
  submitAnswer(socket: WebSocket, text: string): void
  vote(socket: WebSocket, answerId: string): void
  nextRound(socket: WebSocket): void
}

export class LobbyRepositoryImpl implements LobbyRepository {
  async createLobby(playerName: string) {
    const response = await fetch('/lobbies', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ playerName }),
    })
    const body = (await response.json()) as {
      state?: LobbyState
      credentials?: PlayerSession
      error?: { message: string }
    }
    if (!response.ok || !body.state || !body.credentials)
      throw new Error(body.error?.message ?? 'Could not create game')
    return { state: body.state, credentials: body.credentials }
  }

  joinLobby(
    code: string,
    playerName: string,
    onState: (state: LobbyState) => void,
  ) {
    return this.connect(code, { type: 'join', code, playerName }, onState)
  }

  reconnect(code: string, playerId: string, onState: (state: LobbyState) => void) {
    return this.connect(code, { type: 'reconnect', code, playerId }, onState)
  }

  startGame(socket: WebSocket) {
    socket.send(JSON.stringify({ type: 'startTask' }))
  }
  submitAnswer(socket: WebSocket, text: string) {
    socket.send(JSON.stringify({ type: 'submitAnswer', answer: { text } }))
  }
  vote(socket: WebSocket, answerId: string) {
    socket.send(JSON.stringify({ type: 'vote', answerId }))
  }
  nextRound(socket: WebSocket) {
    socket.send(JSON.stringify({ type: 'nextTask' }))
  }

  private connect(
    code: string,
    message: object,
    onState: (state: LobbyState) => void,
  ): Promise<LobbyConnection> {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const socket = new WebSocket(
      `${protocol}//${window.location.host}/ws?code=${code}`,
    )
    return new Promise((resolve, reject) => {
      socket.addEventListener('open', () =>
        socket.send(JSON.stringify(message)),
      )
      socket.addEventListener('message', (event) => {
        const response = JSON.parse(event.data) as
          LobbyResponse | { type: 'error'; error: { message: string } }
        if (response.type === 'error') {
          socket.close()
          reject(new Error(response.error.message))
          return
        }
        onState(response.state)
        if (response.type === 'joined' || response.type === 'resumed')
          resolve({
            socket,
            state: response.state,
            credentials: response.credentials,
          })
      })
      socket.addEventListener('error', () =>
        reject(new Error('Could not connect to game')),
      )
    })
  }
}

const lobbyRepository = new LobbyRepositoryImpl()

export default lobbyRepository
