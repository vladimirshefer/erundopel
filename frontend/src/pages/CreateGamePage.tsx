import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { usePageTitle } from '../lib/react/hooks/usePageTitle.tsx'
import lobbyRepository from '../repositories/LobbyRepository.ts'
import playerProfileRepository from '../repositories/PlayerProfileRepository.ts'
import { useLoc } from '../strings/loc.ts'

export default function CreateGamePage() {
  const loc = useLoc()
  usePageTitle()
  const navigate = useNavigate()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  function createLobby() {
    setIsCreating(true)
    setError('')
    lobbyRepository
      .createLobby(playerProfileRepository.getProfile()?.name ?? loc('Host'))
      .then((lobby) => {
        localStorage.setItem('erundopel.playerId', lobby.credentials.playerId)
        navigate(`/lobby/${lobby.state.code}`, { replace: true })
      })
      .catch(() => {
        setError(loc('Could not create game'))
        setIsCreating(false)
      })
  }

  return (
    <main className="flex w-full max-w-xl flex-col items-center justify-center rounded-3xl bg-white p-8 text-center shadow-2xl sm:p-12">
      <Link
        className="self-start text-sm font-bold text-zinc-700 underline decoration-amber-300 decoration-4 underline-offset-4"
        to="/"
      >
        ← {loc('Back to main')}
      </Link>
      <h1 className="mt-6 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
        {loc('Create game')}
      </h1>
      <button
        className="mt-8 w-full max-w-sm bg-amber-300 px-5 py-3 font-bold text-zinc-950 transition hover:bg-amber-400 disabled:cursor-wait disabled:bg-amber-200"
        disabled={isCreating}
        onClick={createLobby}
        type="button"
      >
        {isCreating ? loc('Creating lobby') : loc('Create game')}
      </button>
      {error && <p className="mt-5 bg-amber-100 px-4 py-3 font-semibold text-zinc-900">{error}</p>}
    </main>
  )
}
