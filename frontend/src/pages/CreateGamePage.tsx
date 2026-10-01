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
    <main>
      <h1>{loc('Create game')}</h1>
      <form onSubmit={createGame}>
        <label>
          {loc('Name')}
          <input name="name" autoComplete="name" autoFocus />
        </label>
        <button>{loc('Create game')}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <p>
        <Link to="/">{loc('Back')}</Link>
      </p>
    </main>
  )
}
