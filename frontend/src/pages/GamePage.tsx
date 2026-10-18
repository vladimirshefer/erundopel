import { useContext, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Md5 } from 'ts-md5'
import { LanguageContext } from '../contexts/LanguageContext.tsx'
import type { DictionaryContentDto } from '../dto/DictionaryContentDto.ts'
import type { GameStateSnapshotDto } from '../dto/GameStateSnapshotDto.ts'
import type { TaskDto } from '../dto/TaskDto.ts'
import { usePageTitle } from '../lib/react/hooks/usePageTitle.tsx'
import dictionaryRepository from '../repositories/DictionaryRepository.ts'
import lobbyRepository from '../repositories/LobbyRepository.ts'
import { useLoc } from '../strings/loc.ts'

const EXTRA_WRONG_ANSWERS_COUNT = 3

export default function GamePage() {
  const loc = useLoc()
  usePageTitle()
  const navigate = useNavigate()
  const { code } = useParams()
  const [lobby, setLobby] = useState<GameStateSnapshotDto>()
  const [error, setError] = useState('')
  const [myAnswer, setMyAnswer] = useState('')
  const [language] = useContext(LanguageContext)
  const dictionaries = dictionaryRepository.getDictionaries()
  const [dictionaryId, setDictionaryId] = useState(
    () => dictionaries.find((dictionary) => dictionary.language === language)?.id ?? dictionaries[0]?.id ?? '',
  )
  const [dictionaryEntries, setDictionaryEntries] = useState<DictionaryContentDto>([])
  const [candidates, setCandidates] = useState<DictionaryContentDto>([])
  const [selectedTask, setSelectedTask] = useState<DictionaryContentDto[number]>()
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
      task = { id: 'custom', text: customWord.trim(), correctAnswer: { text: customAnswer.trim() } }
    }
    if (!task) {
      setError(loc('Choose a word'))
      return
    }
    const roundTask: TaskDto = {
      text: task.text,
      correctAnswer: task.correctAnswer,
      wrongAnswers: [...dictionaryEntries]
        .filter((entry) => entry.id !== task.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, EXTRA_WRONG_ANSWERS_COUNT)
        .map((entry) => entry.correctAnswer),
    }

    setError('')
    if (lobby?.phase === 'lobby') lobbyRepository.startGame(socket.current, roundTask)
    if (lobby?.phase === 'results') lobbyRepository.nextRound(socket.current, roundTask)
  }

  return (
    <main className="w-full max-w-5xl rounded-3xl bg-white p-6 shadow-2xl sm:p-10">
      <h1 className="text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
        {loc('Game')} {lobby.code}
      </h1>
      <section className="mt-5 flex flex-wrap gap-2" aria-label={loc('Players')}>
        {lobby.players.map((item) => (
          <div className="flex items-center gap-2 border-2 border-zinc-950 bg-amber-100 px-2 py-1.5" key={item.id}>
            <img alt="" className="size-7" src={`https://gravatar.com/avatar/${Md5.hashStr(item.name)}?d=robohash&s=56`} />
            <span className="font-bold text-zinc-950">{item.name}</span>
            <span className="text-sm font-black text-zinc-600">{item.score}</span>
          </div>
        ))}
      </section>

      {lobby.phase === 'lobby' && (
        <>
          <p className="mt-8 text-zinc-600">{loc('Send this game code to friends and wait for them here.')}</p>
          {!isOwner && <p className="mt-8 text-zinc-600">{loc('Waiting for the host to start.')}</p>}
        </>
      )}

      {lobby.phase === 'answering' && (
        <>
          <h2 className="mt-8 text-3xl font-black tracking-tight text-zinc-950">{lobby.task?.text}</h2>
          {player?.answered ? (
            <p className="mt-4 border-l-4 border-amber-400 bg-amber-100 px-4 py-3 font-bold text-zinc-800">{loc('Answer sent. Waiting for other players.')}</p>
          ) : (
            <form className="mt-5 border-4 border-zinc-950 bg-amber-300 p-5 shadow-[8px_8px_0_0_#18181b]" onSubmit={submitAnswer}>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-zinc-800">
                {loc('Your answer')}
                <input className="border-2 border-zinc-950 bg-white px-3 py-2.5 text-base outline-none focus:ring-4 focus:ring-white" name="answer" autoFocus />
              </label>
              <button className="mt-4 bg-zinc-950 px-4 py-3 font-black text-white transition hover:-translate-y-0.5 hover:bg-zinc-800">{loc('Send answer')}</button>
            </form>
          )}
          <section className="mt-9">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-xl font-black text-zinc-950">{loc('Answer board')}</h3>
              <p className="text-sm font-bold text-zinc-600">{lobby.players.filter((item) => item.answered).length}/{lobby.players.length}</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lobby.players.map((item) => (
                <article className={`flex items-center gap-3 rounded-2xl border border-zinc-200 p-3 shadow-sm ${item.answered ? 'bg-amber-300' : 'bg-white'}`} key={item.id}>
                  <img alt="" className="size-12" src={`https://gravatar.com/avatar/${Md5.hashStr(item.name)}?d=robohash&s=96`} />
                  <div>
                    <p className="font-black text-zinc-950">{item.name}</p>
                    <p className="mt-0.5 text-sm font-bold text-zinc-700">{item.answered ? loc('Answer in') : loc('Still thinking')}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {lobby.phase === 'voting' && (
        <>
          <h2 className="mt-8 text-3xl font-black tracking-tight text-zinc-950">{lobby.task?.text}</h2>
          {player?.voted ? (
            <p className="mt-4 border-l-4 border-amber-400 bg-amber-100 px-4 py-3 font-bold text-zinc-800">{loc('Vote sent. Waiting for other players.')}</p>
          ) : (
            <form className="mt-5" onSubmit={submitVote}>
              <p className="mb-4 font-bold text-zinc-600">{loc('Choose the answer you think is correct. You cannot choose your own.')}</p>
              <div className="grid gap-4 sm:grid-cols-2">
              {lobby.answerOptions?.map((answer) => (
                <label className="block cursor-pointer" key={answer.id}>
                  <input
                    type="radio"
                    name="answerId"
                    value={answer.id}
                    className="peer sr-only"
                    required
                    disabled={answer.text === myAnswer}
                  />
                  <span className="flex min-h-40 flex-col justify-between border-4 border-zinc-950 bg-white p-5 text-zinc-950 shadow-[6px_6px_0_0_#18181b] transition hover:-translate-y-1 hover:bg-amber-100 peer-checked:bg-amber-300 peer-disabled:cursor-not-allowed peer-disabled:border-zinc-300 peer-disabled:bg-zinc-100 peer-disabled:text-zinc-400 peer-disabled:shadow-none">
                    <span className="text-xs font-black tracking-widest text-zinc-500">{loc('Answer')}</span>
                    <span className="mt-5 text-xl font-black leading-snug">{answer.text}</span>
                  </span>
                </label>
              ))}
              </div>
              <button className="mt-6 w-full bg-amber-300 px-4 py-3 font-black text-zinc-950 transition hover:-translate-y-0.5 hover:bg-amber-400">{loc('Vote')}</button>
            </form>
          )}
          <section className="mt-9">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-xl font-black text-zinc-950">{loc('Voting board')}</h3>
              <p className="text-sm font-bold text-zinc-600">{lobby.players.filter((item) => item.voted).length}/{lobby.players.length}</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lobby.players.map((item) => (
                <article className={`flex items-center gap-3 rounded-2xl border border-zinc-200 p-3 shadow-sm ${item.voted ? 'bg-amber-300' : 'bg-white'}`} key={item.id}>
                  <img alt="" className="size-12" src={`https://gravatar.com/avatar/${Md5.hashStr(item.name)}?d=robohash&s=96`} />
                  <div>
                    <p className="font-black text-zinc-950">{item.name}</p>
                    <p className="mt-0.5 text-sm font-bold text-zinc-700">{item.voted ? loc('Vote in') : loc('Still choosing')}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {lobby.phase === 'results' && (
        <>
          <h2 className="mt-8 text-3xl font-black tracking-tight text-zinc-950">{loc('Results')}</h2>
          <p className="mt-2 font-bold text-zinc-600">{lobby.task?.text}</p>
          <section className="mt-5 grid gap-4 sm:grid-cols-2">
            {lobby.answerOptions?.map((answer) => (
              <article className={`flex min-h-48 flex-col justify-between border-4 border-zinc-950 p-5 shadow-[6px_6px_0_0_#18181b] ${answer.id === lobby.correctAnswerId ? 'bg-amber-300' : 'bg-white'}`} key={answer.id}>
                <div>
                  <p className="text-xs font-black tracking-widest text-zinc-600">{answer.id === lobby.correctAnswerId ? loc('Correct answer') : loc('Answer')}</p>
                  <p className="mt-4 text-xl font-black leading-snug text-zinc-950">{answer.text}</p>
                </div>
                <div className="mt-6 flex items-center gap-2">
                  {lobby.votes?.filter((vote) => vote.answerId === answer.id).map((vote) => {
                    const voter = lobby.players.find((item) => item.id === vote.playerId)
                    return voter && <img alt={voter.name} className="size-10" key={voter.id} src={`https://gravatar.com/avatar/${Md5.hashStr(voter.name)}?d=robohash&s=80`} title={voter.name} />
                  })}
                  {!lobby.votes?.some((vote) => vote.answerId === answer.id) && <p className="text-sm font-bold text-zinc-500">{loc('No votes')}</p>}
                </div>
              </article>
            ))}
          </section>
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
                  setSelectedTask(candidate)
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
