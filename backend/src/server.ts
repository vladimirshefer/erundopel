import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { LobbyError, LobbyManager, type GameStateSnapshot, type TextAnswer } from '@erundopel/core'
import { WebSocketServer, WebSocket } from 'ws'

const port = Number.parseInt(process.env.PORT ?? '8787', 10)
const maxMessagesPerSecond = 20
const lobbies = new LobbyManager()
const clientsByLobby = new Map<string, Set<WebSocket>>()
const socketByPlayer = new Map<string, WebSocket>()

type Session = { code: string; playerId: string }
type SocketWithSession = WebSocket & { session?: Session; windowStartedAt: number; messagesInWindow: number }
type ClientMessage =
  | { type: 'join'; code: string; playerName: string }
  | { type: 'reconnect'; code: string; playerId: string; resumeToken: string }
  | { type: 'leave' }
  | { type: 'closeLobby' }
  | { type: 'startTask' }
  | { type: 'submitAnswer'; answer: TextAnswer }

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)

  if (request.method === 'GET' && url.pathname === '/health') {
    respondJson(response, 200, { ok: true })
    return
  }

  if (request.method === 'POST' && url.pathname === '/lobbies') {
    try {
      const body = await readJson(request)
      const result = lobbies.createLobby({ playerName: stringField(body, 'playerName') })
      respondJson(response, 201, result)
    } catch (error) {
      respondError(response, error)
    }
    return
  }

  respondJson(response, 404, { error: { code: 'NOT_FOUND', message: 'Route was not found.' } })
})

const websocketServer = new WebSocketServer({ noServer: true, maxPayload: 4_096 })

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  if (url.pathname !== '/ws') {
    socket.destroy()
    return
  }
  websocketServer.handleUpgrade(request, socket, head, (websocket) => {
    websocketServer.emit('connection', websocket, request)
  })
})

websocketServer.on('connection', (socket: SocketWithSession) => {
  socket.windowStartedAt = Date.now()
  socket.messagesInWindow = 0

  socket.on('message', (raw, isBinary) => {
    if (isBinary || !withinRateLimit(socket)) {
      socket.close(1008, 'Invalid or excessive messages.')
      return
    }

    try {
      handleMessage(socket, parseClientMessage(raw.toString()))
    } catch (error) {
      send(socket, errorMessage(error))
    }
  })

  socket.on('close', () => disconnect(socket))
})

server.listen(port, () => {
  console.log(`Erundopel backend listening on http://localhost:${port}`)
})

function handleMessage(socket: SocketWithSession, message: ClientMessage): void {
  switch (message.type) {
    case 'join': {
      if (socket.session) throw new Error('Leave the current lobby before joining another one.')
      const result = lobbies.execute(message.code, { type: 'join', playerName: message.playerName })
      const credentials = result.credentials
      if (!credentials) throw new Error('Join did not return player credentials.')
      attach(socket, result.state.code, credentials.playerId)
      send(socket, { type: 'joined', state: result.state, credentials })
      broadcast(result.state)
      return
    }
    case 'reconnect': {
      if (socket.session) throw new Error('Leave the current lobby before reconnecting to another one.')
      const result = lobbies.execute(message.code, {
        type: 'reconnect',
        playerId: message.playerId,
        resumeToken: message.resumeToken,
      })
      attach(socket, result.state.code, message.playerId)
      send(socket, { type: 'resumed', state: result.state })
      broadcast(result.state)
      return
    }
    case 'leave': {
      const session = requireSession(socket)
      const result = lobbies.execute(session.code, { type: 'leave', playerId: session.playerId })
      detach(socket)
      send(socket, { type: 'left' })
      broadcast(result.state)
      return
    }
    case 'closeLobby': {
      const session = requireSession(socket)
      const result = lobbies.execute(session.code, { type: 'close', playerId: session.playerId })
      broadcast(result.state)
      return
    }
    case 'startTask': {
      const session = requireSession(socket)
      const result = lobbies.execute(session.code, { type: 'startTask' })
      broadcast(result.state)
      return
    }
    case 'submitAnswer': {
      const session = requireSession(socket)
      const result = lobbies.execute(session.code, {
        type: 'submitAnswer',
        playerId: session.playerId,
        answer: message.answer,
      })
      broadcast(result.state)
      return
    }
  }
}

function attach(socket: SocketWithSession, code: string, playerId: string): void {
  detach(socket, false)

  const previousSocket = socketByPlayer.get(playerId)
  socket.session = { code, playerId }
  socketByPlayer.set(playerId, socket)
  const clients = clientsByLobby.get(code) ?? new Set<WebSocket>()
  clients.add(socket)
  clientsByLobby.set(code, clients)

  if (previousSocket && previousSocket !== socket) {
    previousSocket.close(4000, 'Connected from another tab.')
  }
}

function disconnect(socket: SocketWithSession): void {
  const session = socket.session
  detach(socket)
  if (!session || socketByPlayer.get(session.playerId)) return

  try {
    const result = lobbies.execute(session.code, { type: 'disconnect', playerId: session.playerId })
    broadcast(result.state)
  } catch (error) {
    if (!(error instanceof LobbyError && error.code === 'LOBBY_CLOSED')) throw error
  }
}

function detach(socket: SocketWithSession, clearSession = true): void {
  const session = socket.session
  if (!session) return

  const clients = clientsByLobby.get(session.code)
  clients?.delete(socket)
  if (clients?.size === 0) clientsByLobby.delete(session.code)
  if (socketByPlayer.get(session.playerId) === socket) socketByPlayer.delete(session.playerId)
  if (clearSession) delete socket.session
}

function broadcast(state: GameStateSnapshot): void {
  const payload = JSON.stringify({ type: 'state', state })
  for (const client of clientsByLobby.get(state.code) ?? []) {
    if (client.readyState === WebSocket.OPEN) client.send(payload)
  }
}

function requireSession(socket: SocketWithSession): Session {
  if (!socket.session) throw new LobbyError('PLAYER_NOT_FOUND', 'Join a lobby first.')
  return socket.session
}

function withinRateLimit(socket: SocketWithSession): boolean {
  const now = Date.now()
  if (now - socket.windowStartedAt >= 1_000) {
    socket.windowStartedAt = now
    socket.messagesInWindow = 0
  }
  socket.messagesInWindow += 1
  return socket.messagesInWindow <= maxMessagesPerSecond
}

function parseClientMessage(raw: string): ClientMessage {
  const message: unknown = JSON.parse(raw)
  if (!message || typeof message !== 'object' || !('type' in message)) {
    throw new Error('Message must contain a type.')
  }

  const type = stringField(message, 'type')
  switch (type) {
    case 'join':
      return { type, code: stringField(message, 'code'), playerName: stringField(message, 'playerName') }
    case 'reconnect':
      return {
        type,
        code: stringField(message, 'code'),
        playerId: stringField(message, 'playerId'),
        resumeToken: stringField(message, 'resumeToken'),
      }
    case 'leave':
    case 'closeLobby':
    case 'startTask':
      return { type }
    case 'submitAnswer':
      return { type, answer: textAnswerField(message, 'answer') }
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

async function readJson(request: IncomingMessage): Promise<unknown> {
  let body = ''
  for await (const chunk of request) body += chunk
  return JSON.parse(body)
}

function send(socket: WebSocket, value: unknown): void {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(value))
}

function errorMessage(error: unknown): { type: 'error'; error: { code: string; message: string } } {
  if (error instanceof LobbyError) {
    return { type: 'error', error: { code: error.code, message: error.message } }
  }
  return {
    type: 'error',
    error: { code: 'BAD_REQUEST', message: error instanceof Error ? error.message : 'Invalid request.' },
  }
}

function respondJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(body))
}

function respondError(response: ServerResponse, error: unknown): void {
  const message = errorMessage(error).error
  const status = error instanceof LobbyError ? 400 : 400
  respondJson(response, status, { error: message })
}
