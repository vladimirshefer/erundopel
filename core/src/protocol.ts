import {
  LobbyError,
  type GameStateSnapshot,
  type LobbyCommand,
  type LobbyCommandResult,
  type PlayerCredentials,
  type TextAnswer,
} from './lobby.js'

export type ClientSession = Readonly<{
  code: string
  playerId: string
}>

export type ClientMessage =
  | Readonly<{ type: 'join'; code: string; playerName: string }>
  | Readonly<{ type: 'reconnect'; code: string; playerId: string }>
  | Readonly<{ type: 'leave' }>
  | Readonly<{ type: 'closeLobby' }>
  | Readonly<{ type: 'startTask' }>
  | Readonly<{ type: 'submitAnswer'; answer: TextAnswer }>
  | Readonly<{ type: 'vote'; answerId: string }>
  | Readonly<{ type: 'nextTask' }>

export type ClientResponse =
  | Readonly<{ type: 'joined'; state: GameStateSnapshot; credentials: PlayerCredentials }>
  | Readonly<{ type: 'resumed'; state: GameStateSnapshot }>
  | Readonly<{ type: 'left' }>

export type ClientDispatchResult = Readonly<{
  state: GameStateSnapshot
  response?: ClientResponse
  nextSession?: ClientSession
  detach?: true
}>

export type ClientErrorResponse = Readonly<{
  type: 'error'
  error: Readonly<{ code: string; message: string }>
}>

export type ExecuteLobbyCommand = (
  code: string,
  command: LobbyCommand,
) => LobbyCommandResult

export function parseClientMessage(raw: string): ClientMessage {
  const message: unknown = JSON.parse(raw)
  const type = stringField(message, 'type')

  switch (type) {
    case 'join':
      return { type, code: stringField(message, 'code'), playerName: stringField(message, 'playerName') }
    case 'reconnect':
      return {
        type,
        code: stringField(message, 'code'),
        playerId: stringField(message, 'playerId'),
      }
    case 'leave':
    case 'closeLobby':
    case 'startTask':
    case 'nextTask':
      return { type }
    case 'submitAnswer':
      return { type, answer: textAnswerField(message, 'answer') }
    case 'vote':
      return { type, answerId: stringField(message, 'answerId') }
    default:
      throw new Error(`Unknown message type: ${type}`)
  }
}

export function dispatchClientMessage(
  message: ClientMessage,
  session: ClientSession | undefined,
  execute: ExecuteLobbyCommand,
): ClientDispatchResult {
  switch (message.type) {
    case 'join': {
      assertNoSession(session)
      const result = execute(message.code, { type: 'join', playerName: message.playerName })
      const credentials = requireCredentials(result)
      return {
        state: result.state,
        response: { type: 'joined', state: result.state, credentials },
        nextSession: { code: result.state.code, playerId: credentials.playerId },
      }
    }
    case 'reconnect': {
      assertNoSession(session)
      const result = execute(message.code, {
        type: 'reconnect',
        playerId: message.playerId,
      })
      return {
        state: result.state,
        response: { type: 'resumed', state: result.state },
        nextSession: { code: result.state.code, playerId: message.playerId },
      }
    }
    case 'leave': {
      const currentSession = requireSession(session)
      const result = execute(currentSession.code, { type: 'leave', playerId: currentSession.playerId })
      return { state: result.state, response: { type: 'left' }, detach: true }
    }
    case 'closeLobby': {
      const currentSession = requireSession(session)
      return execute(currentSession.code, { type: 'close', playerId: currentSession.playerId })
    }
    case 'startTask': {
      const currentSession = requireSession(session)
      return execute(currentSession.code, { type: 'startTask', playerId: currentSession.playerId })
    }
    case 'submitAnswer': {
      const currentSession = requireSession(session)
      return execute(currentSession.code, {
        type: 'submitAnswer',
        playerId: currentSession.playerId,
        answer: message.answer,
      })
    }
    case 'vote': {
      const currentSession = requireSession(session)
      return execute(currentSession.code, {
        type: 'vote',
        playerId: currentSession.playerId,
        answerId: message.answerId,
      })
    }
    case 'nextTask': {
      const currentSession = requireSession(session)
      return execute(currentSession.code, { type: 'nextTask', playerId: currentSession.playerId })
    }
  }
}

export function toClientError(error: unknown): ClientErrorResponse {
  if (error instanceof LobbyError) {
    return { type: 'error', error: { code: error.code, message: error.message } }
  }
  return {
    type: 'error',
    error: { code: 'BAD_REQUEST', message: error instanceof Error ? error.message : 'Invalid request.' },
  }
}

function assertNoSession(session: ClientSession | undefined): void {
  if (session) throw new Error('Leave the current lobby before joining another one.')
}

function requireSession(session: ClientSession | undefined): ClientSession {
  if (!session) throw new LobbyError('PLAYER_NOT_FOUND', 'Join a lobby first.')
  return session
}

function requireCredentials(result: LobbyCommandResult): PlayerCredentials {
  if (!result.credentials) throw new Error('Join did not return player credentials.')
  return result.credentials
}

function stringField(value: unknown, field: string): string {
  if (!isRecord(value) || typeof value[field] !== 'string') {
    throw new Error(`${field} must be a string.`)
  }
  return value[field]
}

function textAnswerField(value: unknown, field: string): TextAnswer {
  if (!isRecord(value) || !isRecord(value[field]) || typeof value[field].text !== 'string') {
    throw new Error(`${field}.text must be a string.`)
  }
  return { text: value[field].text }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}
