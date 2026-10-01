import {
  GameState,
  LobbyError,
  type GameStateSnapshot,
  type LobbyCommandResult,
  type PlayerCredentials,
  type TextAnswer,
} from '@erundopel/core'

const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ROOM_CODE_LENGTH = 6
const MAX_MESSAGE_BYTES = 4_096
const MAX_MESSAGES_PER_SECOND = 20

export interface Env {
  LOBBY: DurableObjectNamespace
}

type Session = { playerId: string }
type SocketState = { session?: Session; windowStartedAt: number; messagesInWindow: number }
type ClientMessage =
  | { type: 'join'; code: string; playerName: string }
  | { type: 'reconnect'; code: string; playerId: string; resumeToken: string }
  | { type: 'leave' }
  | { type: 'closeLobby' }
  | { type: 'startTask' }
  | { type: 'submitAnswer'; answer: TextAnswer }

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true })
    }

    if (request.method === 'POST' && url.pathname === '/lobbies') {
      try {
        const body: unknown = await request.json()
        const playerName = stringField(body, 'playerName')
        return createLobby(env, playerName)
      } catch (error) {
        return errorResponse(error)
      }
    }

    if (request.method === 'GET' && url.pathname === '/ws') {
      const code = url.searchParams.get('code')
      if (!code) return json({ error: { code: 'BAD_REQUEST', message: 'code is required.' } }, 400)
      return env.LOBBY.get(env.LOBBY.idFromName(code.toUpperCase())).fetch(request)
    }

    return json({ error: { code: 'NOT_FOUND', message: 'Route was not found.' } }, 404)
  },
} satisfies ExportedHandler<Env>

export class LobbyDurableObject implements DurableObject {
  #gameState?: GameState
  readonly #sockets = new Map<WebSocket, SocketState>()
  readonly #socketByPlayer = new Map<string, WebSocket>()

  constructor(readonly ctx: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/create') {
      if (this.#gameState) return json({ error: { code: 'ALREADY_EXISTS', message: 'Lobby exists.' } }, 409)
      const body: unknown = await request.json()
      const code = stringField(body, 'code')
      const playerName = stringField(body, 'playerName')
      const created = GameState.create(code, playerName)
      this.#gameState = created.gameState
      return json({ state: created.gameState.snapshot(), credentials: created.credentials }, 201)
    }

    if (request.method === 'GET' && url.pathname === '/ws') {
      if (!this.#gameState) return json({ error: { code: 'LOBBY_NOT_FOUND', message: 'Lobby was not found.' } }, 404)
      if (request.headers.get('Upgrade') !== 'websocket') {
        return json({ error: { code: 'UPGRADE_REQUIRED', message: 'WebSocket upgrade required.' } }, 426)
      }
      return this.#openWebSocket()
    }

    return json({ error: { code: 'NOT_FOUND', message: 'Route was not found.' } }, 404)
  }

  #openWebSocket(): Response {
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    if (!client || !server) throw new Error('Could not create a WebSocket pair.')
    server.accept()
    const socketState: SocketState = { windowStartedAt: Date.now(), messagesInWindow: 0 }
    this.#sockets.set(server, socketState)

    server.addEventListener('message', (event) => {
      void this.#handleMessage(server, event)
    })
    server.addEventListener('close', () => this.#disconnect(server))
    server.addEventListener('error', () => this.#disconnect(server))

    return new Response(null, { status: 101, webSocket: client })
  }

  async #handleMessage(socket: WebSocket, event: MessageEvent): Promise<void> {
    try {
      if (typeof event.data !== 'string' || event.data.length > MAX_MESSAGE_BYTES || !this.#withinRateLimit(socket)) {
        socket.close(1008, 'Invalid or excessive messages.')
        return
      }
      const message = parseClientMessage(event.data)
      const gameState = this.#requireGameState()

      switch (message.type) {
        case 'join': {
          if (this.#sockets.get(socket)?.session) {
            throw new Error('Leave the current lobby before joining another one.')
          }
          this.#assertCode(message.code)
          const result = gameState.execute({ type: 'join', playerName: message.playerName })
          const credentials = result.credentials
          if (!credentials) throw new Error('Join did not return player credentials.')
          this.#attach(socket, credentials.playerId)
          send(socket, { type: 'joined', state: result.state, credentials })
          this.#broadcast(result.state)
          return
        }
        case 'reconnect': {
          if (this.#sockets.get(socket)?.session) {
            throw new Error('Leave the current lobby before reconnecting to another one.')
          }
          this.#assertCode(message.code)
          const result = gameState.execute({
            type: 'reconnect',
            playerId: message.playerId,
            resumeToken: message.resumeToken,
          })
          this.#attach(socket, message.playerId)
          send(socket, { type: 'resumed', state: result.state })
          this.#broadcast(result.state)
          return
        }
        case 'leave': {
          const result = gameState.execute({ type: 'leave', playerId: this.#requireSession(socket).playerId })
          this.#detach(socket)
          send(socket, { type: 'left' })
          this.#broadcast(result.state)
          return
        }
        case 'closeLobby': {
          const result = gameState.execute({ type: 'close', playerId: this.#requireSession(socket).playerId })
          this.#broadcast(result.state)
          return
        }
        case 'startTask': {
          this.#requireSession(socket)
          const result = gameState.execute({ type: 'startTask' })
          this.#broadcast(result.state)
          return
        }
        case 'submitAnswer': {
          const result = gameState.execute({
            type: 'submitAnswer',
            playerId: this.#requireSession(socket).playerId,
            answer: message.answer,
          })
          this.#broadcast(result.state)
          return
        }
      }
    } catch (error) {
      send(socket, { type: 'error', error: toError(error) })
    }
  }

  #attach(socket: WebSocket, playerId: string): void {
    this.#detach(socket, false)
    const previousSocket = this.#socketByPlayer.get(playerId)
    const state = this.#sockets.get(socket)
    if (!state) return
    state.session = { playerId }
    this.#socketByPlayer.set(playerId, socket)
    if (previousSocket && previousSocket !== socket) previousSocket.close(4000, 'Connected from another tab.')
  }

  #disconnect(socket: WebSocket): void {
    const session = this.#sockets.get(socket)?.session
    this.#detach(socket)
    if (!session || this.#socketByPlayer.has(session.playerId) || !this.#gameState) return

    try {
      this.#broadcast(this.#gameState.execute({ type: 'disconnect', playerId: session.playerId }).state)
    } catch (error) {
      if (!(error instanceof LobbyError && error.code === 'LOBBY_CLOSED')) throw error
    }
  }

  #detach(socket: WebSocket, removeSocket = true): void {
    const state = this.#sockets.get(socket)
    const playerId = state?.session?.playerId
    if (playerId && this.#socketByPlayer.get(playerId) === socket) this.#socketByPlayer.delete(playerId)
    if (state) delete state.session
    if (removeSocket) this.#sockets.delete(socket)
  }

  #broadcast(state: GameStateSnapshot): void {
    const payload = JSON.stringify({ type: 'state', state })
    for (const socket of this.#sockets.keys()) {
      if (socket.readyState === WebSocket.OPEN) socket.send(payload)
    }
  }

  #withinRateLimit(socket: WebSocket): boolean {
    const state = this.#sockets.get(socket)
    if (!state) return false
    const now = Date.now()
    if (now - state.windowStartedAt >= 1_000) {
      state.windowStartedAt = now
      state.messagesInWindow = 0
    }
    state.messagesInWindow += 1
    return state.messagesInWindow <= MAX_MESSAGES_PER_SECOND
  }

  #requireGameState(): GameState {
    if (!this.#gameState) throw new LobbyError('LOBBY_NOT_FOUND', 'Lobby was not found.')
    return this.#gameState
  }

  #requireSession(socket: WebSocket): Session {
    const session = this.#sockets.get(socket)?.session
    if (!session) throw new LobbyError('PLAYER_NOT_FOUND', 'Join a lobby first.')
    return session
  }

  #assertCode(code: string): void {
    if (this.#requireGameState().snapshot().code !== code.trim().toUpperCase()) {
      throw new LobbyError('LOBBY_NOT_FOUND', 'Lobby was not found.')
    }
  }
}

async function createLobby(env: Env, playerName: string): Promise<Response> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = createRoomCode()
    const stub = env.LOBBY.get(env.LOBBY.idFromName(code))
    const response = await stub.fetch('https://lobby.internal/create', {
      method: 'POST',
      body: JSON.stringify({ code, playerName }),
      headers: { 'content-type': 'application/json' },
    })
    if (response.status !== 409) return response
  }
  return json({ error: { code: 'UNAVAILABLE', message: 'Could not create a lobby.' } }, 503)
}

function parseClientMessage(raw: string): ClientMessage {
  const value: unknown = JSON.parse(raw)
  const type = stringField(value, 'type')
  switch (type) {
    case 'join':
      return { type, code: stringField(value, 'code'), playerName: stringField(value, 'playerName') }
    case 'reconnect':
      return {
        type,
        code: stringField(value, 'code'),
        playerId: stringField(value, 'playerId'),
        resumeToken: stringField(value, 'resumeToken'),
      }
    case 'leave':
    case 'closeLobby':
    case 'startTask':
      return { type }
    case 'submitAnswer':
      return { type, answer: textAnswerField(value, 'answer') }
    default:
      throw new Error(`Unknown message type: ${type}`)
  }
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

function createRoomCode(): string {
  const randomValues = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH))
  return [...randomValues].map((value) => ROOM_ALPHABET[value % ROOM_ALPHABET.length]).join('')
}

function send(socket: WebSocket, value: unknown): void {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(value))
}

function toError(error: unknown): { code: string; message: string } {
  if (error instanceof LobbyError) return { code: error.code, message: error.message }
  return { code: 'BAD_REQUEST', message: error instanceof Error ? error.message : 'Invalid request.' }
}

function errorResponse(error: unknown): Response {
  return json({ error: toError(error) }, 400)
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status })
}
