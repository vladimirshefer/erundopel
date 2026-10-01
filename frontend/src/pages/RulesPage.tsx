import { Link } from 'react-router'
import { useLoc } from '../strings/loc.ts'

export default function RulesPage() {
  const loc = useLoc()
  return (
    <main className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-10">
      <h1 className="text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">{loc('Rules')}</h1>
      <ol className="mt-8 list-decimal space-y-4 pl-5 text-zinc-700 marker:font-bold marker:text-amber-500">
        <li>{loc('The host creates a game and sends its code to friends.')}</li>
        <li>{loc('Everyone writes a funny answer to the question.')}</li>
        <li>
          {loc(
            'Choose the answer you think is correct. You cannot choose your own.',
          )}
        </li>
        <li>
          {loc(
            'Correct guesses give two points. Your fake answer gives one point for every vote.',
          )}
        </li>
      </ol>
      <p className="mt-8">
        <Link className="font-semibold text-zinc-700 underline decoration-amber-300 decoration-4 underline-offset-4" to="/">{loc('Back')}</Link>
      </p>
    </main>
  )
}
