import type { ClientErrorResponseDto } from '../dto/ClientErrorResponseDto.ts'
import type {
  ClientMessageDto,
  JoinClientMessageDto,
  NextTaskClientMessageDto,
  ReconnectClientMessageDto,
  SpectateClientMessageDto,
  StartTaskClientMessageDto,
  SubmitAnswerClientMessageDto,
  ViewClientMessageDto,
  VoteClientMessageDto,
} from '../dto/ClientMessageDto.ts'
import type { ClientResponseDto } from '../dto/ClientResponseDto.ts'
import type { ClientStateUpdateDto } from '../dto/ClientStateUpdateDto.ts'
import type { CreateLobbyInputDto } from '../dto/CreateLobbyInputDto.ts'
import type { GameStateSnapshotDto } from '../dto/GameStateSnapshotDto.ts'
import type { LobbyCommandResultDto } from '../dto/LobbyCommandResultDto.ts'
import type { PlayerCredentialsDto } from '../dto/PlayerCredentialsDto.ts'
import type { TaskDto } from '../dto/TaskDto.ts'

type LobbyConnection = {
  socket: WebSocket
  state: GameStateSnapshotDto
  credentials?: PlayerCredentialsDto
}

export interface LobbyRepository {
  createLobby(
    playerName: string,
  ): Promise<{ state: GameStateSnapshotDto; credentials: PlayerCredentialsDto }>
  viewLobby(
    code: string,
    onState: (state: GameStateSnapshotDto) => void,
  ): Promise<LobbyConnection>
  spectate(
    socket: WebSocket,
    code: string,
    playerName: string,
  ): Promise<PlayerCredentialsDto>
  joinLobby(
    socket: WebSocket,
    playerName: string,
  ): Promise<PlayerCredentialsDto>
  reconnect(
    code: string,
    playerId: string,
    onState: (state: GameStateSnapshotDto) => void,
  ): Promise<LobbyConnection>
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
    const body = (await response.json()) as
      LobbyCommandResultDto | { error: ClientErrorResponseDto['error'] }
    if (!response.ok || !('credentials' in body) || !body.credentials)
      throw new Error(
        'error' in body ? body.error.message : 'Could not create game',
      )
    return { state: body.state, credentials: body.credentials }
  }

  viewLobby(code: string, onState: (state: GameStateSnapshotDto) => void) {
    return this.connect(
      code,
      {
        type: 'view',
        body: { code },
      } satisfies ClientMessageDto<ViewClientMessageDto>,
      onState,
    )
  }

  spectate(
    socket: WebSocket,
    code: string,
    playerName: string,
  ): Promise<PlayerCredentialsDto> {
    return new Promise((resolve, reject) => {
      const onMessage = (event: MessageEvent) => {
        const response = JSON.parse(event.data) as
          ClientResponseDto | ClientErrorResponseDto
        if ('error' in response) {
          socket.removeEventListener('message', onMessage)
          reject(new Error(response.error.message))
          return
        }
        if (response.type === 'spectating') {
          socket.removeEventListener('message', onMessage)
          resolve(response.credentials!)
        }
      }
      socket.addEventListener('message', onMessage)
      socket.send(
        JSON.stringify({
          type: 'spectate',
          body: { code, playerName },
        } satisfies ClientMessageDto<SpectateClientMessageDto>),
      )
    })
  }

  joinLobby(
    socket: WebSocket,
    playerName: string,
  ): Promise<PlayerCredentialsDto> {
    return new Promise((resolve, reject) => {
      const onMessage = (event: MessageEvent) => {
        const response = JSON.parse(event.data) as
          ClientResponseDto | ClientErrorResponseDto
        if ('error' in response) {
          socket.removeEventListener('message', onMessage)
          reject(new Error(response.error.message))
          return
        }
        if (response.type === 'joined') {
          socket.removeEventListener('message', onMessage)
          resolve(response.credentials!)
        }
      }
      socket.addEventListener('message', onMessage)
      socket.send(
        JSON.stringify({
          type: 'join',
          body: { playerName },
        } satisfies ClientMessageDto<JoinClientMessageDto>),
      )
    })
  }

  reconnect(
    code: string,
    playerId: string,
    onState: (state: GameStateSnapshotDto) => void,
  ) {
    return this.connect(
      code,
      {
        type: 'reconnect',
        body: { code, playerId },
      } satisfies ClientMessageDto<ReconnectClientMessageDto>,
      onState,
    )
  }

  startGame(socket: WebSocket, task: TaskDto) {
    socket.send(
      JSON.stringify({
        type: 'startTask',
        body: { task },
      } satisfies ClientMessageDto<StartTaskClientMessageDto>),
    )
  }

  submitAnswer(socket: WebSocket, text: string) {
    socket.send(
      JSON.stringify({
        type: 'submitAnswer',
        body: { answer: { text } },
      } satisfies ClientMessageDto<SubmitAnswerClientMessageDto>),
    )
  }

  vote(socket: WebSocket, answerId: string) {
    socket.send(
      JSON.stringify({
        type: 'vote',
        body: { answerId },
      } satisfies ClientMessageDto<VoteClientMessageDto>),
    )
  }

  nextRound(socket: WebSocket, task: TaskDto) {
    socket.send(
      JSON.stringify({
        type: 'nextTask',
        body: { task },
      } satisfies ClientMessageDto<NextTaskClientMessageDto>),
    )
  }

  private connect(
    code: string,
    message: ClientMessageDto<any>,
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
        const response = JSON.parse(event.data) as
          ClientStateUpdateDto | ClientErrorResponseDto | ClientResponseDto
        if ('error' in response) {
          socket.close()
          reject(new Error(response.error.message))
          return
        }
        if (!('state' in response)) return
        onState(response.state)
        if (response.type === 'state')
          resolve({
            socket,
            state: response.state,
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
