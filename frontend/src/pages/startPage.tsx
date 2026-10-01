import { useContext, useState } from 'react'
import { Link } from 'react-router'
import { LanguageContext } from '../localization/LanguageContext.ts'
import { useLoc } from '../localization/useLoc.ts'

export function StartPage() {
  const loc = useLoc()
  const [language, setLanguage] = useContext(LanguageContext)
  const [submitted, setSubmitted] = useState(false)

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#39285d_0,_#171324_48rem)] px-5 py-6 sm:p-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md flex-col justify-between sm:min-h-[calc(100vh-5rem)]">
        <header className="flex items-center justify-between">
          <Link
            className="text-lg font-black tracking-[-0.08em] text-white"
            to="/"
          >
            ерундопель
          </Link>
          <label className="sr-only" htmlFor="language">
            {loc('Language')}
          </label>
          <select
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white outline-none"
            id="language"
            onChange={(event) => {
              const nextLanguage = event.target.value as 'en' | 'ru'
              localStorage.setItem('erundopel.language', nextLanguage)
              setLanguage(nextLanguage)
            }}
            value={language}
          >
            <option value="ru">{loc('Russian')}</option>
            <option value="en">{loc('English')}</option>
          </select>
        </header>

        <section className="py-16">
          <p className="mb-3 text-sm font-bold tracking-[0.16em] text-violet-300 uppercase">
            {loc('A game of made-up definitions')}
          </p>
          <h1 className="text-5xl font-black tracking-[-0.07em] text-white sm:text-6xl">
            ерундопель
          </h1>

          <div className="mt-12 rounded-[2rem] border border-white/10 bg-[#251d38]/80 p-5 shadow-2xl shadow-black/25 backdrop-blur">
            <button
              className="flex w-full items-center justify-between rounded-2xl bg-violet-400 px-5 py-4 text-left text-base font-extrabold text-violet-950 transition hover:bg-violet-300"
              type="button"
            >
              {loc('Create game')}
              <span aria-hidden="true">→</span>
            </button>

            <div className="my-6 h-px bg-white/10" />

            <form
              onSubmit={(event) => {
                event.preventDefault()
                setSubmitted(true)
              }}
            >
              <h2 className="text-lg font-extrabold text-white">
                {loc('Join a game')}
              </h2>
              <label
                className="mt-5 block text-sm font-bold text-violet-100"
                htmlFor="name"
              >
                {loc('Name')}
              </label>
              <input
                autoComplete="name"
                className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-violet-200/45 focus:border-violet-300"
                id="name"
                name="name"
                placeholder={loc('Your name')}
                required
              />
              <label
                className="mt-4 block text-sm font-bold text-violet-100"
                htmlFor="room-code"
              >
                {loc('Room code')}
              </label>
              <input
                autoCapitalize="characters"
                className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-mono tracking-[0.2em] text-white uppercase outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-violet-200/45 focus:border-violet-300"
                id="room-code"
                maxLength={6}
                name="room-code"
                placeholder="ABC123"
                required
              />
              <button
                className="mt-6 flex w-full items-center justify-between rounded-2xl border border-violet-300/60 px-5 py-4 text-left text-base font-extrabold text-violet-100 transition hover:border-violet-200 hover:bg-violet-300/10"
                type="submit"
              >
                {loc('Enter the game')}
                <span aria-hidden="true">→</span>
              </button>
              {submitted && (
                <p className="mt-4 text-sm text-violet-200">
                  {loc('Game connection comes next.')}
                </p>
              )}
            </form>
          </div>
        </section>

        <Link
          className="text-sm font-bold text-violet-200 underline decoration-violet-300/50 underline-offset-4 hover:text-white"
          to="/rules"
        >
          {loc('Rules')} →
        </Link>
      </div>
    </main>
  )
}
