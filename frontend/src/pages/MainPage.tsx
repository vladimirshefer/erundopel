import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useLoc } from '../strings/loc.ts'

export default function MainPage() {
  const loc = useLoc()
  const navigate = useNavigate()
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
      <h1 className="text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">Erundopel</h1>
      <p className="mt-3 text-zinc-600">{loc('A small game of funny answers')}</p>
      <p className="mt-7">
        <Link className="inline-flex rounded-xl bg-zinc-950 px-5 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-zinc-700" to="/create">{loc('Create game')}</Link>
      </p>
      <hr className="my-8 border-zinc-200" />
      <h2 className="text-xl font-bold text-zinc-950">{loc('Join game')}</h2>
      <form className="mt-4 flex max-w-sm flex-col gap-4" onSubmit={openLobby}>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-zinc-800">
          {loc('Game code')}
          <input className="rounded-xl border border-zinc-300 px-3 py-2.5 uppercase outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-amber-200" name="code" autoCapitalize="characters" />
        </label>
        <button className="rounded-xl bg-amber-300 px-4 py-3 font-bold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-amber-400">{loc('Enter the game')}</button>
      </form>
      {error && <p className="mt-4 rounded-xl bg-amber-100 px-4 py-3 text-zinc-900" role="alert">{error}</p>}
      <hr className="my-8 border-zinc-200" />
      <Link className="font-semibold text-zinc-700 underline decoration-amber-300 decoration-4 underline-offset-4" to="/rules">{loc('Rules')}</Link>
    </main>
  )
}
