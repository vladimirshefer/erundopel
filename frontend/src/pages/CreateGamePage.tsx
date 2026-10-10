import { useContext, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { LanguageContext } from '../contexts/LanguageContext.tsx'
import { usePageTitle } from '../lib/react/hooks/usePageTitle.tsx'
import dictionaryRepository from '../repositories/DictionaryRepository.ts'
import lobbyRepository from '../repositories/LobbyRepository.ts'
import playerProfileRepository from '../repositories/PlayerProfileRepository.ts'
import { useLoc } from '../strings/loc.ts'

export default function CreateGamePage() {
  const loc = useLoc()
  usePageTitle()
  const navigate = useNavigate()
  const [language] = useContext(LanguageContext)
  const dictionaries = dictionaryRepository.getDictionaries()
  const [dictionaryId, setDictionaryId] = useState(
    () => dictionaries.find((dictionary) => dictionary.language === language)?.id ?? dictionaries[0]?.id ?? '',
  )
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  function createLobby(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsCreating(true)
    setError('')
    dictionaryRepository
      .getDictionaryContent(dictionaryId)
      .then((dictionary) =>
        lobbyRepository.createLobby(
          playerProfileRepository.getProfile()?.name ?? loc('Host'),
          dictionaryId,
          dictionary,
        ),
      )
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
      <form className="mt-8 w-full max-w-sm text-left" onSubmit={createLobby}>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-zinc-800">
          {loc('Question language')}
          <select
            className="border border-zinc-300 bg-white px-3 py-2.5 outline-none focus:border-zinc-950 focus:ring-4 focus:ring-amber-200"
            disabled={isCreating}
            onChange={(event) => setDictionaryId(event.target.value)}
            value={dictionaryId}
          >
            {dictionaries.map((dictionary) => (
              <option key={dictionary.id} value={dictionary.id}>
                {dictionary.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="mt-5 w-full bg-amber-300 px-5 py-3 font-bold text-zinc-950 transition hover:bg-amber-400 disabled:cursor-wait disabled:bg-amber-200"
          disabled={isCreating}
          type="submit"
        >
          {isCreating ? loc('Creating lobby') : loc('Create game')}
        </button>
      </form>
      {error && <p className="mt-5 bg-amber-100 px-4 py-3 font-semibold text-zinc-900">{error}</p>}
    </main>
  )
}
