import assert from 'node:assert/strict'
import test from 'node:test'
import { LobbyError, LobbyManager } from './lobby.js'
import { dispatchClientMessage, parseClientMessage } from './protocol.js'

test('creates a lobby with a player id outside its public state', () => {
  const manager = new LobbyManager()
  const result = manager.createLobby({ playerName: 'Vladimir' })

  assert.equal(result.state.players.length, 1)
  assert.equal(result.state.players[0]?.name, 'Vladimir')
  assert.equal(result.state.players[0]?.connected, false)
  assert.ok(result.credentials?.playerId)
})

test('joins and reconnects players through validated commands', () => {
  const manager = new LobbyManager()
  const lobby = manager.createLobby({ playerName: 'Vladimir' })
  const joined = manager.execute(lobby.state.code, { type: 'join', playerName: 'Anna' })
  const credentials = joined.credentials

  assert.equal(joined.state.players.length, 2)
  assert.ok(credentials)

  const reconnected = manager.execute(lobby.state.code, { type: 'reconnect', playerId: credentials.playerId })
  assert.equal(reconnected.state.players[1]?.connected, true)
})

test('rejects reconnects for an unknown player', () => {
  const manager = new LobbyManager()
  const lobby = manager.createLobby({ playerName: 'Vladimir' })
  assert.throws(
    () =>
      manager.execute(lobby.state.code, {
        type: 'reconnect',
        playerId: 'unknown-player',
      }),
    (error: unknown) => error instanceof LobbyError && error.code === 'PLAYER_NOT_FOUND',
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

  const started = manager.execute(lobby.state.code, { type: 'startTask', playerId: owner.playerId })
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
  assert.equal(completed.state.phase, 'voting')
})

test('does not allow a second answer from the same player', () => {
  const manager = new LobbyManager()
  const lobby = manager.createLobby({ playerName: 'Vladimir' })
  const owner = lobby.credentials
  assert.ok(owner)
  manager.execute(lobby.state.code, { type: 'join', playerName: 'Anna' })

  manager.execute(lobby.state.code, { type: 'startTask', playerId: owner.playerId })
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
  assert.equal(submitted.state.phase, 'voting')
})

test('runs a round from answers to scores', () => {
  const manager = new LobbyManager()
  const lobby = manager.createLobby({ playerName: 'Vladimir' })
  const owner = lobby.credentials!
  const joined = manager.execute(lobby.state.code, { type: 'join', playerName: 'Anna' })
  const anna = joined.credentials!

  manager.execute(lobby.state.code, { type: 'startTask', playerId: owner.playerId })
  manager.execute(lobby.state.code, {
    type: 'submitAnswer',
    playerId: owner.playerId,
    answer: { text: 'Вариант Владимира' },
  })
  const voting = manager.execute(lobby.state.code, {
    type: 'submitAnswer',
    playerId: anna.playerId,
    answer: { text: 'Вариант Анны' },
  })
  const correctAnswerId = voting.state.answerOptions?.find((answer) => answer.id === 'correct')?.id ?? ''
  const ownerAnswerId = voting.state.answerOptions?.find((answer) => answer.text === 'Вариант Владимира')?.id ?? ''
  assert.equal(voting.state.phase, 'voting')
  assert.ok(correctAnswerId)
  assert.ok(ownerAnswerId)

  manager.execute(lobby.state.code, { type: 'vote', playerId: owner.playerId, answerId: correctAnswerId })
  const results = manager.execute(lobby.state.code, { type: 'vote', playerId: anna.playerId, answerId: ownerAnswerId })
  assert.equal(results.state.phase, 'results')
  assert.equal(results.state.players.find((player) => player.id === owner.playerId)?.score, 3)
  assert.equal(results.state.players.find((player) => player.id === anna.playerId)?.score, 0)
})
