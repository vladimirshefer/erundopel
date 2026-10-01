import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import lobbyRepository, {
  type LobbyState,
} from '../repositories/LobbyRepository.ts'
import { useLoc } from '../strings/loc.ts'

export default function LobbyPage() {
  const loc = useLoc()
  const navigate = useNavigate()
  const { code } = useParams()
  const [lobby, setLobby] = useState<LobbyState>()
  const [error, setError] = useState('')
  const [canJoin, setCanJoin] = useState(false)
  const socket = useRef<WebSocket | null>(null)
  const playerId = localStorage.getItem('erundopel.playerId')

  useEffect(() => {
    if (!code) {
      navigate('/')
      return
    }
    if (!playerId) {
      setCanJoin(true)
      return
    }
    lobbyRepository
      .reconnect(code, playerId, setLobby)
      .then((connection) => {
        socket.current = connection.socket
      })
      .catch(() => setCanJoin(true))
    return () => socket.current?.close()
  }, [code, navigate])

  useEffect(() => {
  if (lobby && lobby.phase !== 'lobby') navigate(`/game/${lobby.code}`)
  }, [lobby, navigate])

  async function joinLobby(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = String(new FormData(event.currentTarget).get('name')).trim()
    if (!name || !code) return setError(loc('Enter your name'))
    try {
      const connection = await lobbyRepository.joinLobby(code, name, setLobby)
      if (!connection.credentials) throw new Error(loc('Could not join game'))
      localStorage.setItem('erundopel.playerId', connection.credentials.playerId)
      socket.current = connection.socket
      setCanJoin(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : loc('Could not join game'))
    }
  }

  if (!code) return null
  const player = lobby?.players.find((item) => item.id === playerId)
  const isOwner = lobby?.ownerPlayerId === playerId

  return (
    <main className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-10">
      <p className="text-sm font-bold uppercase tracking-widest text-amber-600">{loc('Game code')}</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">{code}</h1>

      {lobby && <>
        <h2 className="mt-8 text-xl font-bold text-zinc-950">{loc('Players')}</h2>
        <ul className="mt-4 space-y-2">
          {lobby.players.filter((item) => item.connected).map((item) => <li className="rounded-xl bg-zinc-100 px-4 py-3 font-semibold text-zinc-800" key={item.id}>{item.name}</li>)}
        </ul>
      </>}

      {canJoin && <form className="mt-8 flex max-w-sm flex-col gap-4" onSubmit={joinLobby}>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-zinc-800">
          {loc('Name')}
          <input className="rounded-xl border border-zinc-300 px-3 py-2.5 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-amber-200" name="name" autoComplete="name" autoFocus />
        </label>
        <button className="rounded-xl bg-amber-300 px-4 py-3 font-bold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-amber-400">{loc('Enter the game')}</button>
      </form>}

      {player && <>
        <p className="mt-8 text-zinc-600">{loc('Send this game code to friends and wait for them here.')}</p>
        {isOwner ? <button className="mt-4 rounded-xl bg-zinc-950 px-5 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-zinc-700" onClick={() => lobbyRepository.startGame(socket.current!)}>{loc('Start game')}</button> : <p className="mt-4 text-zinc-600">{loc('Waiting for the host to start.')}</p>}
      </>}

      {error && <p className="mt-5 rounded-xl bg-amber-100 px-4 py-3 text-zinc-900" role="alert">{error}</p>}
      <p className="mt-8"><Link className="font-semibold text-zinc-700 underline decoration-amber-300 decoration-4 underline-offset-4" to="/rules">{loc('Rules')}</Link></p>
    </main>
  )
}
