import { Link } from 'react-router'
import { useLoc } from '../localization/useLoc.ts'

export function RulesPage() {
  const loc = useLoc()

  return (
    <main className="min-h-screen bg-[#171324] px-5 py-10 text-[#f8f5ff] sm:p-16">
      <section className="mx-auto max-w-md">
        <Link
          className="text-sm font-bold text-violet-300 hover:text-violet-100"
          to="/"
        >
          ← {loc('Back')}
        </Link>
        <h1 className="mt-10 text-4xl font-black tracking-[-0.06em]">
          {loc('How to play')}
        </h1>
        <ol className="mt-8 space-y-5 text-lg leading-relaxed text-violet-100">
          <li>{loc('Choose a rare word that nobody knows.')}</li>
          <li>{loc('Write a believable fake definition.')}</li>
          <li>{loc('Find the real definition and fool the others.')}</li>
        </ol>
      </section>
    </main>
  )
}
