import assert from 'node:assert/strict'
import test from 'node:test'
import { LobbyError, LobbyManager } from './lobby.js'
import { dispatchClientMessage, parseClientMessage } from './protocol.js'

test('creates a lobby and exposes no reconnect tokens in its public state', () => {
  const manager = new LobbyManager()
  const result = manager.createLobby({ playerName: 'Vladimir' })

  assert.equal(result.state.players.length, 1)
  assert.equal(result.state.players[0]?.name, 'Vladimir')
  assert.equal(result.state.players[0]?.connected, false)
  assert.ok(result.credentials?.resumeToken)
  assert.equal(JSON.stringify(result.state).includes('resumeToken'), false)
})

test('joins and reconnects players through validated commands', () => {
  const manager = new LobbyManager()
  const lobby = manager.createLobby({ playerName: 'Vladimir' })
  const joined = manager.execute(lobby.state.code, { type: 'join', playerName: 'Anna' })
  const credentials = joined.credentials

  assert.equal(joined.state.players.length, 2)
  assert.ok(credentials)

  const reconnected = manager.execute(lobby.state.code, {
    type: 'reconnect',
    playerId: credentials.playerId,
    resumeToken: credentials.resumeToken,
  })
  assert.equal(reconnected.state.players[1]?.connected, true)
})

test('rejects reconnects with a wrong token', () => {
  const manager = new LobbyManager()
  const lobby = manager.createLobby({ playerName: 'Vladimir' })
  const joined = manager.execute(lobby.state.code, { type: 'join', playerName: 'Anna' })

  assert.throws(
    () =>
      manager.execute(lobby.state.code, {
        type: 'reconnect',
        playerId: joined.credentials?.playerId ?? '',
        resumeToken: 'wrong-token',
      }),
    (error: unknown) => error instanceof LobbyError && error.code === 'INVALID_CREDENTIALS',
  )
})

test('only the creator can close a lobby', () => {
  const manager = new LobbyManager()
  const lobby = manager.createLobby({ playerName: 'Vladimir' })
  const owner = lobby.credentials
  const joined = manager.execute(lobby.state.code, { type: 'join', playerName: 'Anna' })
  const player = joined.credentials
  assert.ok(owner)
  assert.ok(player)

  assert.throws(
    () => manager.execute(lobby.state.code, { type: 'close', playerId: player.playerId }),
    (error: unknown) => error instanceof LobbyError && error.code === 'FORBIDDEN',
  )

  const closed = manager.execute(lobby.state.code, { type: 'close', playerId: owner.playerId })
  assert.equal(closed.state.closed, true)
})

test('starts a task and completes after every current player answers once', () => {
  const manager = new LobbyManager()
  const lobby = manager.createLobby({ playerName: 'Vladimir' })
  const owner = lobby.credentials
  const joined = manager.execute(lobby.state.code, { type: 'join', playerName: 'Anna' })
  const player = joined.credentials
  assert.ok(owner)
  assert.ok(player)

  const started = manager.execute(lobby.state.code, { type: 'startTask' })
  assert.equal(started.state.phase, 'answering')
  assert.ok(started.state.task?.text)
  assert.equal(JSON.stringify(started.state).includes('correctAnswer'), false)

  const firstAnswer = manager.execute(lobby.state.code, {
    type: 'submitAnswer',
    playerId: owner.playerId,
    answer: { text: 'Мой вариант' },
  })
  assert.equal(firstAnswer.state.phase, 'answering')
  assert.equal(firstAnswer.state.players[0]?.answered, true)

  const completed = manager.execute(lobby.state.code, {
    type: 'submitAnswer',
    playerId: player.playerId,
    answer: { text: 'Другой вариант' },
  })
  assert.equal(completed.state.phase, 'completed')
})

test('does not allow a second answer from the same player', () => {
  const manager = new LobbyManager()
  const lobby = manager.createLobby({ playerName: 'Vladimir' })
  const owner = lobby.credentials
  assert.ok(owner)
  manager.execute(lobby.state.code, { type: 'join', playerName: 'Anna' })

  manager.execute(lobby.state.code, { type: 'startTask' })
  manager.execute(lobby.state.code, {
    type: 'submitAnswer',
    playerId: owner.playerId,
    answer: { text: 'Первый вариант' },
  })

  assert.throws(
    () =>
      manager.execute(lobby.state.code, {
        type: 'submitAnswer',
        playerId: owner.playerId,
        answer: { text: 'Второй вариант' },
      }),
    (error: unknown) => error instanceof LobbyError && error.code === 'ANSWER_ALREADY_SUBMITTED',
  )
})

test('maps WebSocket messages to core commands', () => {
  const manager = new LobbyManager()
  const lobby = manager.createLobby({ playerName: 'Vladimir' })
  const owner = lobby.credentials
  assert.ok(owner)

  const session = { code: lobby.state.code, playerId: owner.playerId }
  const started = dispatchClientMessage(
    parseClientMessage('{"type":"startTask"}'),
    session,
    manager.execute.bind(manager),
  )
  assert.equal(started.state.phase, 'answering')

  const submitted = dispatchClientMessage(
    parseClientMessage('{"type":"submitAnswer","answer":{"text":"Мой вариант"}}'),
    session,
    manager.execute.bind(manager),
  )
  assert.equal(submitted.state.phase, 'completed')
})
