import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import {
  LobbyError,
  LobbyManager,
  dispatchClientMessage,
  parseClientMessage,
  toClientError,
  type ClientMessage,
  type ClientSession,
  type GameStateSnapshot,
} from '@erundopel/core'
import { WebSocketServer, WebSocket } from 'ws'

const port = Number.parseInt(process.env.PORT ?? '8787', 10)
const maxMessagesPerSecond = 20
const lobbies = new LobbyManager()
const clientsByLobby = new Map<string, Set<WebSocket>>()
const socketByPlayer = new Map<string, WebSocket>()

type SocketWithSession = WebSocket & {
  session?: ClientSession
  windowStartedAt: number
  messagesInWindow: number
}

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
      send(socket, toClientError(error))
    }
  })

  socket.on('close', () => disconnect(socket))
})

server.listen(port, () => {
  console.log(`Erundopel backend listening on http://localhost:${port}`)
})

function handleMessage(socket: SocketWithSession, message: ClientMessage): void {
  const result = dispatchClientMessage(message, socket.session, (code, command) =>
    lobbies.execute(code, command),
  )
  if (result.detach) detach(socket)
  if (result.nextSession) attach(socket, result.nextSession)
  if (result.response) send(socket, result.response)
  broadcast(result.state)
}

function attach(socket: SocketWithSession, session: ClientSession): void {
  detach(socket, false)

  const previousSocket = socketByPlayer.get(session.playerId)
  socket.session = session
  socketByPlayer.set(session.playerId, socket)
  const clients = clientsByLobby.get(session.code) ?? new Set<WebSocket>()
  clients.add(socket)
  clientsByLobby.set(session.code, clients)

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

function withinRateLimit(socket: SocketWithSession): boolean {
  const now = Date.now()
  if (now - socket.windowStartedAt >= 1_000) {
    socket.windowStartedAt = now
    socket.messagesInWindow = 0
  }
  socket.messagesInWindow += 1
  return socket.messagesInWindow <= maxMessagesPerSecond
}

function stringField(value: unknown, field: string): string {
  if (!isRecord(value) || typeof value[field] !== 'string') {
    throw new Error(`${field} must be a string.`)
  }
  return value[field]
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

function respondJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(body))
}

function respondError(response: ServerResponse, error: unknown): void {
  respondJson(response, 400, { error: toClientError(error).error })
}
