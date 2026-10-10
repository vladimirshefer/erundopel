import type { ClientErrorResponseDto } from '../dto/ClientErrorResponseDto.ts'
import type { ClientMessageDto } from '../dto/ClientMessageDto.ts'
import type { ClientResponseDto } from '../dto/ClientResponseDto.ts'
import type { CreateLobbyInputDto } from '../dto/CreateLobbyInputDto.ts'
import type { GameStateSnapshotDto } from '../dto/GameStateSnapshotDto.ts'
import type { LobbyCommandResultDto } from '../dto/LobbyCommandResultDto.ts'
import type { PlayerCredentialsDto } from '../dto/PlayerCredentialsDto.ts'
import type { TaskDto } from '../dto/TaskDto.ts'

type ClientResponseWithStateDto = Exclude<ClientResponseDto, { type: 'left' }>

type LobbyConnection = {
  socket: WebSocket
  state: GameStateSnapshotDto
  credentials?: PlayerCredentialsDto
}

export interface LobbyRepository {
  createLobby(playerName: string): Promise<{ state: GameStateSnapshotDto; credentials: PlayerCredentialsDto }>
  viewLobby(code: string, onState: (state: GameStateSnapshotDto) => void): Promise<LobbyConnection>
  spectate(socket: WebSocket, code: string, playerName: string): Promise<PlayerCredentialsDto>
  joinLobby(socket: WebSocket, playerName: string): Promise<PlayerCredentialsDto>
  reconnect(code: string, playerId: string, onState: (state: GameStateSnapshotDto) => void): Promise<LobbyConnection>
  startGame(socket: WebSocket, task: TaskDto): void
  submitAnswer(socket: WebSocket, text: string): void
  vote(socket: WebSocket, answerId: string): void
  nextRound(socket: WebSocket, task: TaskDto): void
}

export class LobbyRepositoryImpl implements LobbyRepository {
  async createLobby(playerName: string) {
    const input: CreateLobbyInputDto = { playerName }
    const response = await fetch('/lobbies', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
    const body = (await response.json()) as LobbyCommandResultDto | { error: ClientErrorResponseDto['error'] }
    if (!response.ok || !('credentials' in body) || !body.credentials)
      throw new Error('error' in body ? body.error.message : 'Could not create game')
    return { state: body.state, credentials: body.credentials }
  }

  viewLobby(code: string, onState: (state: GameStateSnapshotDto) => void) {
    return this.connect(code, { type: 'view', code }, onState)
  }

  spectate(socket: WebSocket, code: string, playerName: string): Promise<PlayerCredentialsDto> {
    return new Promise((resolve, reject) => {
      const onMessage = (event: MessageEvent) => {
        const response = JSON.parse(event.data) as ClientResponseDto | ClientErrorResponseDto
        if (response.type === 'error') {
          socket.removeEventListener('message', onMessage)
          reject(new Error(response.error.message))
          return
        }
        if (response.type === 'spectating') {
          socket.removeEventListener('message', onMessage)
          resolve(response.credentials)
        }
      }
      socket.addEventListener('message', onMessage)
      socket.send(JSON.stringify({ type: 'spectate', code, playerName } satisfies ClientMessageDto))
    })
  }

  joinLobby(socket: WebSocket, playerName: string): Promise<PlayerCredentialsDto> {
    return new Promise((resolve, reject) => {
      const onMessage = (event: MessageEvent) => {
        const response = JSON.parse(event.data) as ClientResponseDto | ClientErrorResponseDto
        if (response.type === 'error') {
          socket.removeEventListener('message', onMessage)
          reject(new Error(response.error.message))
          return
        }
        if (response.type === 'joined') {
          socket.removeEventListener('message', onMessage)
          resolve(response.credentials)
        }
      }
      socket.addEventListener('message', onMessage)
      socket.send(JSON.stringify({ type: 'join', playerName } satisfies ClientMessageDto))
    })
  }

  reconnect(code: string, playerId: string, onState: (state: GameStateSnapshotDto) => void) {
    return this.connect(code, { type: 'reconnect', code, playerId }, onState)
  }

  startGame(socket: WebSocket, task: TaskDto) {
    socket.send(JSON.stringify({ type: 'startTask', task } satisfies ClientMessageDto))
  }

  submitAnswer(socket: WebSocket, text: string) {
    socket.send(JSON.stringify({ type: 'submitAnswer', answer: { text } } satisfies ClientMessageDto))
  }

  vote(socket: WebSocket, answerId: string) {
    socket.send(JSON.stringify({ type: 'vote', answerId } satisfies ClientMessageDto))
  }

  nextRound(socket: WebSocket, task: TaskDto) {
    socket.send(JSON.stringify({ type: 'nextTask', task } satisfies ClientMessageDto))
  }

  private connect(
    code: string,
    message: ClientMessageDto,
    onState: (state: GameStateSnapshotDto) => void,
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
        const response = JSON.parse(event.data) as ClientResponseWithStateDto | ClientErrorResponseDto
        if (response.type === 'error') {
          socket.close()
          reject(new Error(response.error.message))
          return
        }
        onState(response.state)
        if (response.type === 'viewed' || response.type === 'spectating' || response.type === 'joined' || response.type === 'resumed')
          resolve({
            socket,
            state: response.state,
            credentials: response.type === 'spectating' || response.type === 'joined' ? response.credentials : undefined,
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
