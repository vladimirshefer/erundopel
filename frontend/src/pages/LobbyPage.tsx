import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Md5 } from 'ts-md5'
import { usePageTitle } from '../lib/react/hooks/usePageTitle.tsx'
import lobbyRepository, {type LobbyPlayer, type LobbyState} from '../repositories/LobbyRepository.ts'
import { useLoc } from '../strings/loc.ts'

export default function LobbyPage() {
  const loc = useLoc()
  const navigate = useNavigate()
  const { code } = useParams()
  usePageTitle(`${loc('Erundopel')} - ${code}`)
  const socket = useRef<WebSocket | null>(null)
  const [lobby, setLobby] = useState<LobbyState>()
  const [playerId, setPlayerId] = useState(() => localStorage.getItem('erundopel.playerId'))
  const [joinForm, setJoinForm] = useState(false)
  const [canJoin, setCanJoin] = useState(false)
  const [error, setError] = useState('')
  const [isLinkCopied, setIsLinkCopied] = useState(false)
  const isPlaying = lobby?.players.some((player) => player.id === playerId) ?? false

  useEffect(() => {
    if (!code) {
      navigate('/', { replace: true })
      return
    }

    if (!playerId) {
      let active = true
      let connectedSocket: WebSocket | null = null
      setCanJoin(true)
      lobbyRepository
        .viewLobby(code, (state) => {
          if (active) setLobby(state)
        })
        .then(async (connection) => {
          if (!active) {
            connection.socket.close()
            return
          }
          connectedSocket = connection.socket
          socket.current = connectedSocket
          const credentials = await lobbyRepository.spectate(connection.socket, code, `Ghost-${crypto.randomUUID().slice(0, 8)}`)
          if (!active) return
          localStorage.setItem('erundopel.playerId', credentials.playerId)
          setPlayerId(credentials.playerId)
        })
        .catch(() => {
          if (active) setError(loc('Could not join game'))
        })
      return () => {
        active = false
        connectedSocket?.close()
        if (socket.current === connectedSocket) socket.current = null
      }
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
        if (active) {
          setLobby(state)
          setCanJoin(!state.players.some((player) => player.id === playerId))
        }
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
        if (!active) return
        setCanJoin(true)
        lobbyRepository
          .viewLobby(code, (state) => {
            if (active) setLobby(state)
          })
          .then(async (connection) => {
            if (!active) {
              connection.socket.close()
              return
            }
            connectedSocket = connection.socket
            socket.current = connectedSocket
            const credentials = await lobbyRepository.spectate(connection.socket, code, `Ghost-${crypto.randomUUID().slice(0, 8)}`)
            if (!active) return
            localStorage.setItem('erundopel.playerId', credentials.playerId)
            setPlayerId(credentials.playerId)
          })
          .catch(() => {
            if (active) setError(loc('Could not join game'))
          })
      })

    return () => {
      active = false
      connectedSocket?.close()
      if (socket.current === connectedSocket) socket.current = null
    }
  }, [code, navigate, playerId])

  useEffect(() => {
    if (lobby && isPlaying && lobby.phase !== 'lobby') navigate(`/game/${lobby.code}`, { replace: true })
  }, [isPlaying, lobby, navigate])

  async function joinLobby(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!code) return

    const name = new FormData(event.currentTarget).get('name')?.toString().trim()
    if (!name) {
      setError(loc('Enter your name'))
      return
    }

    try {
      if (!socket.current || socket.current.readyState !== WebSocket.OPEN) {
        setError(loc('Could not join game'))
        return
      }
      const { playerId: joinedPlayerId } = await lobbyRepository.joinLobby(socket.current, name)

      localStorage.setItem('erundopel.playerId', joinedPlayerId)
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
      lobbyRepository.startGame(activeSocket)
    } catch {
      setError(loc('Could not start game'))
    }
  }

  async function copyInviteLink() {
    if (!code) return

    await navigator.clipboard.writeText(`${window.location.origin}/lobby/${code}`)
    setIsLinkCopied(true)
  }

  const players: LobbyPlayer[] = lobby?.players ?? []
  const spectators: LobbyPlayer[] = lobby?.spectators ?? []
  const isOwner: Boolean = lobby?.ownerPlayerId === playerId

  return (
    <main className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-10">
      <Link className="text-sm font-bold text-zinc-700 underline decoration-amber-300 decoration-4 underline-offset-4" to="/">
        ← {loc('Back to main')}
      </Link>

      <section className="mt-6 rounded-3xl bg-zinc-950 p-6 text-white">
        <p className="text-lg font-black">{loc('Invite players')}</p>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-amber-300">{loc('Game code')}</p>
            <p className="mt-1 text-3xl font-black tracking-widest">{code}</p>
          </div>
          <button className="rounded-xl bg-amber-300 px-4 py-3 font-black text-zinc-950 transition hover:-translate-y-0.5 hover:bg-amber-400" onClick={copyInviteLink} type="button">
            {isLinkCopied ? loc('Link copied') : loc('Copy link')}
          </button>
        </div>
      </section>

      <p className="mt-6 text-lg font-semibold text-zinc-600">{loc('Who is playing?')}</p>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        {players.map((player) => (
          <article className="flex min-h-48 flex-col justify-between border-4 border-zinc-950 bg-amber-300 p-5 text-zinc-950 shadow-lg transition duration-300 hover:-translate-y-1" key={player.id}>
            <img
              alt=""
              className="size-24 border-2 border-zinc-950 bg-white object-cover sm:size-28"
              src={`https://gravatar.com/avatar/${Md5.hashStr(player.id)}?d=robohash&s=224`}
            />
            <div className="mt-5">
              <p className="text-2xl font-black leading-tight">{player.name}</p>
              {player.id === lobby?.ownerPlayerId && <span className="mt-2 block text-sm font-bold">{loc('Host')}</span>}
            </div>
          </article>
        ))}

        {canJoin && lobby?.phase === 'lobby' && !joinForm && (
          <button className="flex min-h-48 flex-col items-center justify-center border-4 border-dashed border-zinc-300 text-zinc-700 transition duration-300 hover:-translate-y-1 hover:border-zinc-950 hover:bg-zinc-100" onClick={() => setJoinForm(true)} type="button">
            <span className="text-6xl font-black">+</span>
            <span className="mt-1 font-black">{loc('Join game')}</span>
          </button>
        )}

        {canJoin && lobby?.phase === 'lobby' && joinForm && (
          <form className="flex min-h-48 flex-col justify-center bg-zinc-950 p-4 text-white shadow-lg" onSubmit={joinLobby}>
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

      {spectators.length > 0 && (
        <>
          <p className="mt-8 text-lg font-semibold text-zinc-600">{loc('Spectators')}</p>
          <section className="mt-6 grid gap-4 sm:grid-cols-2">
            {spectators.map((spectator) => (
              <article className="flex min-h-48 flex-col justify-between border-4 border-zinc-950 bg-white p-5 text-zinc-950 shadow-lg" key={spectator.id}>
                <img
                  alt=""
                  className="size-24 border-2 border-zinc-950 bg-white object-cover sm:size-28"
                  src={`https://gravatar.com/avatar/${Md5.hashStr(spectator.id)}?d=robohash&s=224`}
                />
                <p className="mt-5 text-2xl font-black leading-tight">{spectator.name}</p>
              </article>
            ))}
          </section>
        </>
      )}

      {error && <p className="mt-5 font-bold text-amber-600">{error}</p>}

      {isPlaying && lobby && (
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
