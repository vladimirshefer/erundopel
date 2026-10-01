import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import lobbyRepository, {
  type PlayerSession,
} from '../repositories/LobbyRepository.ts'
import { useLoc } from '../strings/loc.ts'

export default function MainPage() {
  const loc = useLoc()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  async function joinGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name')).trim()
    const code = String(form.get('code')).trim().toUpperCase()
    if (!name || !code) return setError(loc('Fill in your name and game code'))
    try {
      const connection = await lobbyRepository.joinLobby(code, name, () => {})
      const credentials = connection.credentials
      if (!credentials) throw new Error(loc('Could not join game'))
      localStorage.setItem(
        'erundopel.session',
        JSON.stringify({ code, ...credentials } satisfies PlayerSession),
      )
      connection.socket.close()
      navigate(`/game/${code}`)
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : loc('Could not join game'),
      )
    }
  }

  return (
    <main>
      <h1>Erundopel</h1>
      <p>{loc('A small game of funny answers')}</p>
      <p>
        <Link to="/create">{loc('Create game')}</Link>
      </p>
      <hr />
      <h2>{loc('Join game')}</h2>
      <form onSubmit={joinGame}>
        <label>
          {loc('Name')}
          <input name="name" autoComplete="name" />
        </label>
        <label>
          {loc('Game code')}
          <input name="code" autoCapitalize="characters" />
        </label>
        <button>{loc('Enter the game')}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <hr />
      <Link to="/rules">{loc('Rules')}</Link>
    </main>
  )
}
