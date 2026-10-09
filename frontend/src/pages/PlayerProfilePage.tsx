import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Md5 } from 'ts-md5'
import { usePageTitle } from '../lib/react/hooks/usePageTitle.tsx'
import playerProfileRepository from '../repositories/PlayerProfileRepository.ts'
import { useLoc } from '../strings/loc.ts'

export default function PlayerProfilePage() {
  const loc = useLoc()
  usePageTitle(`${loc('Erundopel')} - ${loc('Profile')}`)
  const [name, setName] = useState(
    () => playerProfileRepository.getProfile()?.name ?? '',
  )
  const [saved, setSaved] = useState(false)

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const profileName = name.trim()
    if (!profileName) return

    playerProfileRepository.saveProfile({ name: profileName })
    setName(profileName)
    setSaved(true)
  }

  return (
    <main className="w-full max-w-xl bg-white p-6 shadow-2xl sm:p-10">
      <Link
        className="text-sm font-bold text-zinc-700 underline decoration-amber-300 decoration-4 underline-offset-4"
        to="/"
      >
        ← {loc('Back to main')}
      </Link>
      <h1 className="mt-6 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
        {loc('Profile')}
      </h1>
      <p className="mt-3 text-zinc-600">
        {loc('Your name is used when you join a game')}
      </p>
      <img
        alt=""
        className="mt-6 size-32 border-4 border-zinc-950 bg-white object-cover"
        src={`https://gravatar.com/avatar/${Md5.hashStr(name || 'profile')}?d=robohash&s=256`}
      />
      <form
        className="mt-8 flex max-w-sm flex-col gap-4"
        onSubmit={saveProfile}
      >
        <label
          className="flex flex-col gap-1.5 text-sm font-semibold text-zinc-800"
          htmlFor="name"
        >
          {loc('Your name')}
          <input
            autoFocus
            className="border border-zinc-300 px-3 py-2.5 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-amber-200"
            id="name"
            onChange={(event) => {
              setName(event.target.value)
              setSaved(false)
            }}
            value={name}
          />
        </label>
        <button
          className="bg-amber-300 px-4 py-3 font-bold text-zinc-950 transition hover:bg-amber-400"
          type="submit"
        >
          {loc('Save profile')}
        </button>
      </form>
      {saved && (
        <p className="mt-4 bg-amber-100 px-4 py-3 font-semibold text-zinc-900">
          {loc('Profile saved')}
        </p>
      )}
    </main>
  )
}
