import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import lobbyRepository, {
  type LobbyState,
  type PlayerSession,
} from '../repositories/LobbyRepository.ts'
import { useLoc } from '../strings/loc.ts'

export default function GamePage() {
  const loc = useLoc()
  const navigate = useNavigate()
  const { code } = useParams()
  const [lobby, setLobby] = useState<LobbyState>()
  const [error, setError] = useState('')
  const [myAnswer, setMyAnswer] = useState('')
  const socket = useRef<WebSocket | null>(null)
  const savedSession = localStorage.getItem('erundopel.session')
  const session = savedSession
    ? (JSON.parse(savedSession) as PlayerSession)
    : undefined

  useEffect(() => {
    if (!session || session.code !== code) {
      navigate('/')
      return
    }
    lobbyRepository
      .reconnect(session, setLobby)
      .then((connection) => {
        socket.current = connection.socket
      })
      .catch((reason) => {
        setError(
          reason instanceof Error
            ? reason.message
            : loc('Could not connect to game'),
        )
      })
    return () => socket.current?.close()
  }, [code, navigate])

  if (!lobby || !session)
    return (
      <main>
        <p>{error || loc('Connecting...')}</p>
      </main>
    )
  const player = lobby.players.find((item) => item.id === session.playerId)
  const isOwner = lobby.ownerPlayerId === session.playerId

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = String(new FormData(event.currentTarget).get('answer')).trim()
    if (text) {
      setMyAnswer(text)
      lobbyRepository.submitAnswer(socket.current!, text)
    }
  }

  function submitVote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const answerId = String(new FormData(event.currentTarget).get('answerId'))
    if (answerId) lobbyRepository.vote(socket.current!, answerId)
  }

  return (
    <main>
      <h1>
        {loc('Game')} {lobby.code}
      </h1>
      <p>
        {loc('Players')}:{' '}
        {lobby.players.map((item) => `${item.name} (${item.score})`).join(', ')}
      </p>

      {lobby.phase === 'lobby' && (
        <>
          <p>{loc('Send this game code to friends and wait for them here.')}</p>
          {isOwner && (
            <button onClick={() => lobbyRepository.startGame(socket.current!)}>
              {loc('Start game')}
            </button>
          )}
          {!isOwner && <p>{loc('Waiting for the host to start.')}</p>}
        </>
      )}

      {lobby.phase === 'answering' && (
        <>
          <h2>{lobby.task?.text}</h2>
          {player?.answered ? (
            <p>{loc('Answer sent. Waiting for other players.')}</p>
          ) : (
            <form onSubmit={submitAnswer}>
              <label>
                {loc('Your answer')}
                <input name="answer" autoFocus />
              </label>
              <button>{loc('Send answer')}</button>
            </form>
          )}
        </>
      )}

      {lobby.phase === 'voting' && (
        <>
          <h2>{lobby.task?.text}</h2>
          {player?.voted ? (
            <p>{loc('Vote sent. Waiting for other players.')}</p>
          ) : (
            <form onSubmit={submitVote}>
              {lobby.answerOptions?.map((answer) => (
                <label key={answer.id}>
                  <input
                    type="radio"
                    name="answerId"
                    value={answer.id}
                    required
                    disabled={answer.text === myAnswer}
                  />
                  {answer.text}
                </label>
              ))}
              <button>{loc('Vote')}</button>
            </form>
          )}
        </>
      )}

      {lobby.phase === 'results' && (
        <>
          <h2>{loc('Results')}</h2>
          <p>
            {loc('Correct answer')}:{' '}
            {
              lobby.answerOptions?.find(
                (answer) => answer.id === lobby.correctAnswerId,
              )?.text
            }
          </p>
          {isOwner ? (
            <button onClick={() => lobbyRepository.nextRound(socket.current!)}>
              {loc('Next round')}
            </button>
          ) : (
            <p>{loc('Waiting for the host to start the next round.')}</p>
          )}
        </>
      )}

      {error && <p role="alert">{error}</p>}
      <p>
        <Link to="/rules">{loc('Rules')}</Link>
      </p>
    </main>
  )
}
