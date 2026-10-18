import { Link } from 'react-router'
import { FiExternalLink } from 'react-icons/fi'
import { usePageTitle } from '../lib/react/hooks/usePageTitle.tsx'
import { useLoc } from '../strings/loc.ts'

interface ExternalGame {
  name: string
  url: string
}

const externalGames: ExternalGame[] = [
  { name: 'Gartic Phone', url: 'https://garticphone.com/' },
  { name: 'Codenames', url: 'https://codenames.me/' },
]

export default function GameSelectorPage() {
  const loc = useLoc()
  usePageTitle()

  return (
    <main className="flex w-full max-w-xl flex-col items-center justify-center rounded-3xl bg-white p-8 text-center shadow-2xl sm:p-12">
      <Link
        className="self-start text-sm font-bold text-zinc-700 underline decoration-amber-300 decoration-4 underline-offset-4"
        to="/"
      >
        ← {loc('Back to main')}
      </Link>
      <h1 className="mt-6 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
        {loc('Choose a game')}
      </h1>
      <div className="mt-8 flex w-full max-w-sm flex-col gap-4">
        <Link
          className="rounded-xl bg-amber-300 px-5 py-4 text-left font-bold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-amber-400"
          to="/create"
        >
          <span className="block text-lg">{loc('Erundopel')}</span>
          <span className="block text-sm font-semibold text-zinc-800">
            {loc('A small game of funny answers')}
          </span>
        </Link>
        {externalGames.map((game) => (
          <a
            className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-5 py-4 text-left font-bold text-zinc-700 transition hover:-translate-y-0.5 hover:border-zinc-950 hover:bg-zinc-100"
            href={game.url}
            key={game.name}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span>
              <span className="block text-lg">{game.name}</span>
              <span className="block text-sm font-semibold text-zinc-500">
                {loc('Opens on another website')}
              </span>
            </span>
            <FiExternalLink className="shrink-0 text-zinc-500" size={20} />
          </a>
        ))}
      </div>
    </main>
  )
}
