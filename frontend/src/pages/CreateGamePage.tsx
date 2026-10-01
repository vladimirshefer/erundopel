import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import lobbyRepository, {
  type PlayerSession,
} from '../repositories/LobbyRepository.ts'
import { useLoc } from '../strings/loc.ts'

export default function CreateGamePage() {
  const loc = useLoc()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  async function createGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = String(new FormData(event.currentTarget).get('name')).trim()
    if (!name) return setError(loc('Enter your name'))
    try {
      const lobby = await lobbyRepository.createLobby(name)
      localStorage.setItem(
        'erundopel.session',
        JSON.stringify({
          code: lobby.state.code,
          ...lobby.credentials,
        } satisfies PlayerSession),
      )
      navigate(`/game/${lobby.state.code}`)
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : loc('Could not create game'),
      )
    }
  }

  return (
    <main className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-10">
      <h1 className="text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">{loc('Create game')}</h1>
      <form className="mt-8 flex max-w-sm flex-col gap-4" onSubmit={createGame}>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-zinc-800">
          {loc('Name')}
          <input className="rounded-xl border border-zinc-300 px-3 py-2.5 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-amber-200" name="name" autoComplete="name" autoFocus />
        </label>
        <button className="rounded-xl bg-zinc-950 px-4 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-zinc-700">{loc('Create game')}</button>
      </form>
      {error && <p className="mt-4 rounded-xl bg-amber-100 px-4 py-3 text-zinc-900" role="alert">{error}</p>}
      <p className="mt-8">
        <Link className="font-semibold text-zinc-700 underline decoration-amber-300 decoration-4 underline-offset-4" to="/">{loc('Back')}</Link>
      </p>
    </main>
  )
}
