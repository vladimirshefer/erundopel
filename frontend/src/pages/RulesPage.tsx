import { Link } from 'react-router'
import { useLoc } from '../strings/loc.ts'

export default function RulesPage() {
  const loc = useLoc()
  return (
    <main>
      <h1>{loc('Rules')}</h1>
      <ol>
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
      <p>
        <Link to="/">{loc('Back')}</Link>
      </p>
    </main>
  )
}
