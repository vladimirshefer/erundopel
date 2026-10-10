import { useContext, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { LanguageContext } from '../contexts/LanguageContext.tsx'
import { usePageTitle } from '../lib/react/hooks/usePageTitle.tsx'
import dictionaryRepository, {
  type DictionaryContentDto,
} from '../repositories/DictionaryRepository.ts'
import lobbyRepository, {
  type LobbyState,
  type RoundTask,
} from '../repositories/LobbyRepository.ts'
import { useLoc } from '../strings/loc.ts'

export default function GamePage() {
  const loc = useLoc()
  usePageTitle()
  const navigate = useNavigate()
  const { code } = useParams()
  const [lobby, setLobby] = useState<LobbyState>()
  const [error, setError] = useState('')
  const [myAnswer, setMyAnswer] = useState('')
  const [language] = useContext(LanguageContext)
  const dictionaries = dictionaryRepository.getDictionaries()
  const [dictionaryId, setDictionaryId] = useState(
    () => dictionaries.find((dictionary) => dictionary.language === language)?.id ?? dictionaries[0]?.id ?? '',
  )
  const [dictionaryEntries, setDictionaryEntries] = useState<DictionaryContentDto>([])
  const [candidates, setCandidates] = useState<DictionaryContentDto>([])
  const [selectedTask, setSelectedTask] = useState<RoundTask>()
  const [customWord, setCustomWord] = useState('')
  const [customAnswer, setCustomAnswer] = useState('')
  const socket = useRef<WebSocket | null>(null)
  const playerId = localStorage.getItem('erundopel.playerId')
  const isOwner = lobby?.ownerPlayerId === playerId

  useEffect(() => {
    if (!code || !playerId) {
      navigate(code ? `/lobby/${code}` : '/')
      return
    }
    lobbyRepository
      .reconnect(code, playerId, setLobby)
      .then((connection) => {
        socket.current = connection.socket
      })
      .catch((reason) => {
        setError(
          reason instanceof Error
            ? reason.message
            : loc('Could not connect to game'),
        )
      })
    return () => socket.current?.close()
  }, [code, navigate])

  useEffect(() => {
    if (!isOwner) return
    dictionaryRepository
      .getDictionaryContent(dictionaryId)
      .then((entries) => {
        setDictionaryEntries(entries)
        setCandidates([...entries].sort(() => Math.random() - 0.5).slice(0, 4))
        setSelectedTask(undefined)
      })
      .catch(() => setError(loc('Could not load dictionary')))
  }, [dictionaryId, isOwner])

  if (!lobby || !playerId)
    return (
      <main className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-10">
        <p className="text-zinc-600">{error || loc('Connecting...')}</p>
        {error && (
          <Link
            className="mt-5 inline-block rounded-xl bg-amber-300 px-4 py-3 font-bold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-amber-400"
            to="/"
          >
            {loc('Back to main')}
          </Link>
        )}
      </main>
    )
  const player = lobby.players.find((item) => item.id === playerId)

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = String(new FormData(event.currentTarget).get('answer')).trim()
    if (text) {
      setMyAnswer(text)
      lobbyRepository.submitAnswer(socket.current!, text)
    }
  }

  function submitVote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const answerId = String(new FormData(event.currentTarget).get('answerId'))
    if (answerId) lobbyRepository.vote(socket.current!, answerId)
  }

  function startRound(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!socket.current) return

    let task = selectedTask
    if (customWord.trim() || customAnswer.trim()) {
      if (!customWord.trim() || !customAnswer.trim()) {
        setError(loc('Enter a word and its meaning'))
        return
      }
      task = { text: customWord.trim(), correctAnswer: { text: customAnswer.trim() } }
    }
    if (!task) {
      setError(loc('Choose a word'))
      return
    }

    setError('')
    if (lobby?.phase === 'lobby') lobbyRepository.startGame(socket.current, task)
    if (lobby?.phase === 'results') lobbyRepository.nextRound(socket.current, task)
  }

  return (
    <main className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-10">
      <h1 className="text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
        {loc('Game')} {lobby.code}
      </h1>
      <p className="mt-3 text-zinc-600">
        {loc('Players')}:{' '}
        {lobby.players.map((item) => `${item.name} (${item.score})`).join(', ')}
      </p>

      {lobby.phase === 'lobby' && (
        <>
          <p className="mt-8 text-zinc-600">{loc('Send this game code to friends and wait for them here.')}</p>
          {!isOwner && <p className="mt-8 text-zinc-600">{loc('Waiting for the host to start.')}</p>}
        </>
      )}

      {lobby.phase === 'answering' && (
        <>
          <h2 className="mt-8 text-2xl font-bold tracking-tight text-zinc-950">{lobby.task?.text}</h2>
          {player?.answered ? (
            <p className="mt-4 text-zinc-600">{loc('Answer sent. Waiting for other players.')}</p>
          ) : (
            <form className="mt-5 flex flex-col gap-4" onSubmit={submitAnswer}>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-zinc-800">
                {loc('Your answer')}
                <input className="rounded-xl border border-zinc-300 px-3 py-2.5 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-amber-200" name="answer" autoFocus />
              </label>
              <button className="rounded-xl bg-amber-300 px-4 py-3 font-bold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-amber-400">{loc('Send answer')}</button>
            </form>
          )}
        </>
      )}

      {lobby.phase === 'voting' && (
        <>
          <h2 className="mt-8 text-2xl font-bold tracking-tight text-zinc-950">{lobby.task?.text}</h2>
          {player?.voted ? (
            <p className="mt-4 text-zinc-600">{loc('Vote sent. Waiting for other players.')}</p>
          ) : (
            <form className="mt-5 flex flex-col gap-3" onSubmit={submitVote}>
              {lobby.answerOptions?.map((answer) => (
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 p-4 text-zinc-800 transition hover:border-zinc-950 has-[:checked]:border-zinc-950 has-[:checked]:bg-amber-100" key={answer.id}>
                  <input
                    type="radio"
                    name="answerId"
                    value={answer.id}
                    className="size-4 accent-zinc-950"
                    required
                    disabled={answer.text === myAnswer}
                  />
                  {answer.text}
                </label>
              ))}
              <button className="mt-1 rounded-xl bg-amber-300 px-4 py-3 font-bold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-amber-400">{loc('Vote')}</button>
            </form>
          )}
        </>
      )}

      {lobby.phase === 'results' && (
        <>
          <h2 className="mt-8 text-2xl font-bold tracking-tight text-zinc-950">{loc('Results')}</h2>
          <p className="mt-4 rounded-xl bg-amber-100 p-4 text-zinc-800">
            {loc('Correct answer')}:{' '}
            {
              lobby.answerOptions?.find(
                (answer) => answer.id === lobby.correctAnswerId,
              )?.text
            }
          </p>
          {!isOwner && (
            <p className="mt-5 text-zinc-600">{loc('Waiting for the host to start the next round.')}</p>
          )}
        </>
      )}

      {isOwner && (lobby.phase === 'lobby' || lobby.phase === 'results') && (
        <form className="mt-8 border-4 border-zinc-950 bg-white p-5" onSubmit={startRound}>
          <h2 className="text-2xl font-black text-zinc-950">{loc('Choose a word')}</h2>
          <label className="mt-5 flex flex-col gap-1.5 text-sm font-bold text-zinc-800">
            {loc('Dictionary')}
            <select
              className="border-2 border-zinc-950 bg-white px-3 py-2.5 outline-none focus:ring-4 focus:ring-amber-300"
              onChange={(event) => setDictionaryId(event.target.value)}
              value={dictionaryId}
            >
              {dictionaries.map((dictionary) => (
                <option key={dictionary.id} value={dictionary.id}>{dictionary.name}</option>
              ))}
            </select>
          </label>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {candidates.map((candidate) => (
              <button
                className={`min-h-32 border-4 border-zinc-950 p-4 text-left text-lg font-black text-zinc-950 shadow-[4px_4px_0_0_#18181b] transition hover:-translate-y-1 ${selectedTask?.text === candidate.text ? 'bg-amber-300' : 'bg-white'}`}
                key={candidate.id}
                onClick={() => {
                  setSelectedTask({ text: candidate.text, correctAnswer: candidate.correctAnswer })
                  setCustomWord('')
                  setCustomAnswer('')
                }}
                type="button"
              >
                {candidate.text}
              </button>
            ))}
          </div>
          <button
            className="mt-4 border-2 border-zinc-950 bg-white px-4 py-2 font-bold text-zinc-950 hover:bg-zinc-100"
            disabled={dictionaryEntries.length === 0}
            onClick={() => {
              setCandidates([...dictionaryEntries].sort(() => Math.random() - 0.5).slice(0, 4))
              setSelectedTask(undefined)
            }}
            type="button"
          >
            {loc('Other words')}
          </button>
          <p className="mt-8 text-sm font-bold uppercase tracking-widest text-zinc-500">{loc('Or write your own')}</p>
          <label className="mt-3 flex flex-col gap-1.5 text-sm font-bold text-zinc-800">
            {loc('Word')}
            <input
              className="border-2 border-zinc-950 px-3 py-2.5 outline-none focus:ring-4 focus:ring-amber-300"
              onChange={(event) => setCustomWord(event.target.value)}
              value={customWord}
            />
          </label>
          <label className="mt-3 flex flex-col gap-1.5 text-sm font-bold text-zinc-800">
            {loc('Correct meaning')}
            <input
              className="border-2 border-zinc-950 px-3 py-2.5 outline-none focus:ring-4 focus:ring-amber-300"
              onChange={(event) => setCustomAnswer(event.target.value)}
              value={customAnswer}
            />
          </label>
          <button className="mt-6 w-full bg-amber-300 px-5 py-3 text-lg font-black text-zinc-950 hover:bg-amber-400" type="submit">
            {lobby.phase === 'lobby' ? loc('Start game') : loc('Start next round')}
          </button>
        </form>
      )}

      {error && <p className="mt-5 rounded-xl bg-amber-100 px-4 py-3 text-zinc-900" role="alert">{error}</p>}
      <p className="mt-8">
        <Link className="font-semibold text-zinc-700 underline decoration-amber-300 decoration-4 underline-offset-4" to="/rules">{loc('Rules')}</Link>
      </p>
    </main>
  )
}
