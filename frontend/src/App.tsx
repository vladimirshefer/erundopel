import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Link, Route, Routes } from 'react-router'
import { LanguageContextProvider } from './contexts/LanguageContext.tsx'
import CreateGamePage from './pages/CreateGamePage.tsx'
import GamePage from './pages/GamePage.tsx'
import LobbyLoadingPage from './pages/LobbyLoadingPage.tsx'
import LobbyPage from './pages/LobbyPage.tsx'
import MainPage from './pages/MainPage.tsx'
import RulesPage from './pages/RulesPage.tsx'

const queryClient = new QueryClient()

export default function App() {
  return (
    <LanguageContextProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
      <div className="flex min-h-screen items-center justify-center bg-amber-300 p-4 sm:p-8">
        <Link aria-label="Back to main" className="fixed left-5 top-5 rounded-xl bg-white px-4 py-2 font-black text-zinc-950 shadow-2xl transition hover:-translate-y-0.5" to="/">
          ←
        </Link>
        <Routes>
              <Route path="/" element={<MainPage />} />
              <Route path="/create" element={<CreateGamePage />} />
        <Route path="/lobby/:code" element={<LobbyLoadingPage />} />
        <Route path="/lobby/:code/room" element={<LobbyPage />} />
              <Route path="/game/:code" element={<GamePage />} />
              <Route path="/rules" element={<RulesPage />} />
              <Route path="*" element={<MainPage />} />
            </Routes>
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    </LanguageContextProvider>
  )
}
