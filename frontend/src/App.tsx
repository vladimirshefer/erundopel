import { Link, Route, Routes } from 'react-router'

function Home() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-slate-100">
      <section className="max-w-lg space-y-4 text-center">
        <p className="text-sm font-medium tracking-widest text-cyan-400 uppercase">
          erundopel
        </p>
        <h1 className="text-4xl font-bold tracking-tight">Frontend is ready</h1>
        <p className="text-slate-400">
          React, TypeScript, React Router, React Query, and Tailwind are
          configured.
        </p>
      </section>
    </main>
  )
}

function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-slate-100">
      <Link className="text-cyan-400 hover:text-cyan-300" to="/">
        Back home
      </Link>
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
