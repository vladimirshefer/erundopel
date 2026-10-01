import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import lobbyRepository from '../repositories/LobbyRepository.ts'
import { useLoc } from '../strings/loc.ts'

export default function CreateGamePage() {
  const loc = useLoc()
  const navigate = useNavigate()
  const started = useRef(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (started.current) return
    started.current = true

    lobbyRepository
      .createLobby(loc('Host'))
      .then((lobby) => {
        localStorage.setItem('erundopel.playerId', lobby.credentials.playerId)
        navigate(`/lobby/${lobby.state.code}`, { replace: true })
      })
      .catch(() => setError(loc('Could not create game')))
  }, [loc, navigate])

  return (
    <main className="flex w-full max-w-xl flex-col items-center justify-center rounded-3xl bg-white p-8 text-center shadow-2xl sm:p-12">
      {error ? (
        <>
          <p className="text-xl font-black text-zinc-950">{error}</p>
          <Link className="mt-6 rounded-xl bg-zinc-950 px-5 py-3 font-bold text-white" to="/">
            {loc('Back to main')}
          </Link>
        </>
      ) : (
        <>
          <div className="flex size-20 animate-bounce items-center justify-center rounded-3xl bg-amber-300 text-4xl font-black text-zinc-950">?</div>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">{loc('Creating lobby')}</h1>
          <p className="mt-3 text-lg font-semibold text-zinc-600">{loc('Preparing funny questions')}</p>
        </>
      )}
    </main>
  )
}
