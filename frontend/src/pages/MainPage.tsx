import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { FiArrowRight, FiHash } from 'react-icons/fi'
import ProfilePreview from '../components/ProfilePreview.tsx'
import { usePageTitle } from '../lib/react/hooks/usePageTitle.tsx'
import { useLoc } from '../strings/loc.ts'

export default function MainPage() {
  const loc = useLoc()
  usePageTitle()
  const navigate = useNavigate()
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [error, setError] = useState('')

  function openLobby(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const code = String(form.get('code')).trim().toUpperCase()
    if (!code) return setError(loc('Fill in your game code'))
    navigate(`/lobby/${code}`)
  }

  return (
    <main className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-10">
      <ProfilePreview />

      <div className="mt-10 text-center">
        <h1 className="text-5xl font-black tracking-tight text-zinc-950 sm:text-6xl">
          Erundopel
        </h1>
        <p className="mt-3 text-lg text-zinc-600">
          {loc('A small game of funny answers')}
        </p>
      </div>

      <Link
        className="mt-8 flex items-center justify-center gap-2 rounded-2xl bg-amber-300 px-6 py-5 text-xl font-black text-zinc-950 shadow-lg transition hover:-translate-y-1 hover:bg-amber-400"
        to="/games"
      >
        {loc('Create game')}
        <FiArrowRight size={22} />
      </Link>

      <div className="mt-5">
        {!showJoinForm ? (
          <button
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-6 py-4 font-bold text-zinc-700 transition hover:border-zinc-950 hover:bg-zinc-50 hover:text-zinc-950"
            onClick={() => setShowJoinForm(true)}
            type="button"
          >
            <FiHash size={18} />
            {loc('Join game')}
          </button>
        ) : (
          <form
            className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4"
            onSubmit={openLobby}
          >
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-zinc-800">
              {loc('Game code')}
              <input
                autoFocus
                className="rounded-xl border border-zinc-300 px-3 py-2.5 uppercase outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-amber-200"
                name="code"
                autoCapitalize="characters"
              />
            </label>
            <button className="rounded-xl bg-zinc-950 px-4 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-zinc-700">
              {loc('Enter the game')}
            </button>
          </form>
        )}
        {error && (
          <p
            className="mt-4 rounded-xl bg-amber-100 px-4 py-3 text-zinc-900"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>

      <p className="mt-8 text-center">
        <Link
          className="text-sm font-semibold text-zinc-500 underline decoration-amber-300 decoration-4 underline-offset-4"
          to="/rules"
        >
          {loc('Rules')}
        </Link>
      </p>
    </main>
  )
}
