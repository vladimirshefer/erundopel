import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import lobbyRepository, { type LobbyState } from '../repositories/LobbyRepository.ts'
import { useLoc } from '../strings/loc.ts'

export default function LobbyPage() {
  const loc = useLoc()
  const navigate = useNavigate()
  const { code } = useParams()
  const socket = useRef<WebSocket | null>(null)
  const [lobby, setLobby] = useState<LobbyState>()
  const [playerId, setPlayerId] = useState(() => localStorage.getItem('erundopel.playerId'))
  const [joinForm, setJoinForm] = useState(false)
  const [canJoin, setCanJoin] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!code) {
      navigate('/', { replace: true })
      return
    }

    if (!playerId) {
      setCanJoin(true)
      return
    }

    if (socket.current) {
      const connectedSocket = socket.current
      return () => {
        connectedSocket.close()
        if (socket.current === connectedSocket) socket.current = null
      }
    }

    let active = true
    let connectedSocket: WebSocket | null = null
    lobbyRepository
      .reconnect(code, playerId, (state) => {
        if (active) setLobby(state)
      })
      .then((connection) => {
        if (!active) {
          connection.socket.close()
          return
        }
        connectedSocket = connection.socket
        socket.current = connectedSocket
      })
      .catch(() => {
        if (active) setCanJoin(true)
      })

    return () => {
      active = false
      connectedSocket?.close()
      if (socket.current === connectedSocket) socket.current = null
    }
  }, [code, navigate, playerId])

  useEffect(() => {
    if (lobby && lobby.phase !== 'lobby') navigate(`/game/${lobby.code}`, { replace: true })
  }, [lobby, navigate])

  async function joinLobby(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!code) return

    const name = new FormData(event.currentTarget).get('name')?.toString().trim()
    if (!name) {
      setError(loc('Enter your name'))
      return
    }

    try {
      const connection = await lobbyRepository.joinLobby(code, name, setLobby)
      const joinedPlayerId = connection.credentials?.playerId
      if (!joinedPlayerId) {
        connection.socket.close()
        setError(loc('Could not join game'))
        return
      }

      localStorage.setItem('erundopel.playerId', joinedPlayerId)
      socket.current = connection.socket
      setPlayerId(joinedPlayerId)
      setCanJoin(false)
      setJoinForm(false)
    } catch {
      setError(loc('Could not join game'))
    }
  }

  async function startGame() {
    if (!code || !playerId) return

    try {
      let activeSocket = socket.current
      if (activeSocket?.readyState !== WebSocket.OPEN) {
        const connection = await lobbyRepository.reconnect(code, playerId, setLobby)
        activeSocket = connection.socket
        socket.current = activeSocket
      }
      activeSocket.send(JSON.stringify({ type: 'start', playerId }))
    } catch {
      setError(loc('Could not start game'))
    }
  }

  const players = lobby?.players.filter((player) => player.connected) ?? []
  const isOwner = lobby?.players[0]?.id === playerId

  return (
    <main className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-10">
      <Link className="text-sm font-bold text-zinc-700 underline decoration-amber-300 decoration-4 underline-offset-4" to="/">
        ← {loc('Back to main')}
      </Link>

      <p className="mt-6 text-sm font-bold tracking-widest text-amber-600">{loc('Game code')}</p>
      <h1 className="mt-1 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">{code}</h1>
      <p className="mt-3 text-lg font-semibold text-zinc-600">{loc('Who is playing?')}</p>

      <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {players.map((player) => (
          <article className="flex aspect-square flex-col justify-between rounded-3xl bg-amber-300 p-5 text-zinc-950 shadow-lg transition duration-300 hover:-translate-y-1 hover:rotate-1" key={player.id}>
            <span className="text-3xl">😈</span>
            <p className="text-xl font-black leading-tight">{player.name}</p>
            {player.id === lobby?.players[0]?.id && <span className="text-sm font-bold">{loc('Host')}</span>}
          </article>
        ))}

        {canJoin && !joinForm && (
          <button className="flex aspect-square flex-col items-center justify-center rounded-3xl border-4 border-dashed border-zinc-300 text-zinc-700 transition duration-300 hover:-translate-y-1 hover:border-zinc-950 hover:bg-zinc-100" onClick={() => setJoinForm(true)} type="button">
            <span className="text-6xl font-black">+</span>
            <span className="mt-1 font-black">{loc('Join game')}</span>
          </button>
        )}

        {canJoin && joinForm && (
          <form className="flex aspect-square flex-col justify-center rounded-3xl bg-zinc-950 p-4 text-white shadow-lg" onSubmit={joinLobby}>
            <label className="text-sm font-bold" htmlFor="name">
              {loc('Your name')}
            </label>
            <input autoFocus className="mt-2 rounded-xl bg-white px-3 py-2 text-zinc-950 outline-none focus:ring-4 focus:ring-amber-300" id="name" name="name" />
            <button className="mt-3 rounded-xl bg-amber-300 px-3 py-2 font-black text-zinc-950 transition hover:bg-amber-400" type="submit">
              {loc('Join')}
            </button>
          </form>
        )}
      </section>

      {error && <p className="mt-5 font-bold text-amber-600">{error}</p>}

      {playerId && lobby && (
        <section className="mt-8 rounded-3xl bg-zinc-950 p-6 text-white">
          {isOwner ? (
            <>
              <p className="text-lg font-black">{loc('Ready for nonsense?')}</p>
              <button className="mt-4 w-full rounded-xl bg-amber-300 px-5 py-3 text-lg font-black text-zinc-950 transition hover:-translate-y-0.5 hover:bg-amber-400" onClick={startGame} type="button">
                {loc('Start game')}
              </button>
            </>
          ) : (
            <p className="text-lg font-black">{loc('Waiting for the host to start')}</p>
          )}
        </section>
      )}
    </main>
  )
}
