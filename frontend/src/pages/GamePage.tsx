import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import lobbyRepository, {
  type LobbyState,
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
  const playerId = localStorage.getItem('erundopel.playerId')

  useEffect(() => {
    if (!code || !playerId) {
      navigate(code ? `/lobby/${code}` : '/')
      return
    }
    lobbyRepository
      .reconnect(code, playerId, setLobby)
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

  useEffect(() => {
    if (lobby?.phase === 'lobby') navigate(`/lobby/${lobby.code}`)
  }, [lobby, navigate])

  if (!lobby || !playerId)
    return (
      <main className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-10">
        <p className="text-zinc-600">{error || loc('Connecting...')}</p>
      </main>
    )
  const player = lobby.players.find((item) => item.id === playerId)
  const isOwner = lobby.ownerPlayerId === playerId

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
    <main className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-10">
      <h1 className="text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
        {loc('Game')} {lobby.code}
      </h1>
      <p className="mt-3 text-zinc-600">
        {loc('Players')}:{' '}
        {lobby.players.map((item) => `${item.name} (${item.score})`).join(', ')}
      </p>

      {lobby.phase === 'lobby' && (
        <>
          <p className="mt-8 text-zinc-600">{loc('Send this game code to friends and wait for them here.')}</p>
          {isOwner && (
            <button className="mt-2 rounded-xl bg-zinc-950 px-5 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-zinc-700" onClick={() => lobbyRepository.startGame(socket.current!)}>
              {loc('Start game')}
            </button>
          )}
          {!isOwner && <p className="mt-8 text-zinc-600">{loc('Waiting for the host to start.')}</p>}
        </>
      )}

      {lobby.phase === 'answering' && (
        <>
          <h2 className="mt-8 text-2xl font-bold tracking-tight text-zinc-950">{lobby.task?.text}</h2>
          {player?.answered ? (
            <p className="mt-4 text-zinc-600">{loc('Answer sent. Waiting for other players.')}</p>
          ) : (
            <form className="mt-5 flex flex-col gap-4" onSubmit={submitAnswer}>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-zinc-800">
                {loc('Your answer')}
                <input className="rounded-xl border border-zinc-300 px-3 py-2.5 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-amber-200" name="answer" autoFocus />
              </label>
              <button className="rounded-xl bg-amber-300 px-4 py-3 font-bold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-amber-400">{loc('Send answer')}</button>
            </form>
          )}
        </>
      )}

      {lobby.phase === 'voting' && (
        <>
          <h2 className="mt-8 text-2xl font-bold tracking-tight text-zinc-950">{lobby.task?.text}</h2>
          {player?.voted ? (
            <p className="mt-4 text-zinc-600">{loc('Vote sent. Waiting for other players.')}</p>
          ) : (
            <form className="mt-5 flex flex-col gap-3" onSubmit={submitVote}>
              {lobby.answerOptions?.map((answer) => (
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 p-4 text-zinc-800 transition hover:border-zinc-950 has-[:checked]:border-zinc-950 has-[:checked]:bg-amber-100" key={answer.id}>
                  <input
                    type="radio"
                    name="answerId"
                    value={answer.id}
                    className="size-4 accent-zinc-950"
                    required
                    disabled={answer.text === myAnswer}
                  />
                  {answer.text}
                </label>
              ))}
              <button className="mt-1 rounded-xl bg-amber-300 px-4 py-3 font-bold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-amber-400">{loc('Vote')}</button>
            </form>
          )}
        </>
      )}

      {lobby.phase === 'results' && (
        <>
          <h2 className="mt-8 text-2xl font-bold tracking-tight text-zinc-950">{loc('Results')}</h2>
          <p className="mt-4 rounded-xl bg-amber-100 p-4 text-zinc-800">
            {loc('Correct answer')}:{' '}
            {
              lobby.answerOptions?.find(
                (answer) => answer.id === lobby.correctAnswerId,
              )?.text
            }
          </p>
          {isOwner ? (
            <button className="mt-5 rounded-xl bg-zinc-950 px-5 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-zinc-700" onClick={() => lobbyRepository.nextRound(socket.current!)}>
              {loc('Next round')}
            </button>
          ) : (
            <p className="mt-5 text-zinc-600">{loc('Waiting for the host to start the next round.')}</p>
          )}
        </>
      )}

      {error && <p className="mt-5 rounded-xl bg-amber-100 px-4 py-3 text-zinc-900" role="alert">{error}</p>}
      <p className="mt-8">
        <Link className="font-semibold text-zinc-700 underline decoration-amber-300 decoration-4 underline-offset-4" to="/rules">{loc('Rules')}</Link>
      </p>
    </main>
  )
}
