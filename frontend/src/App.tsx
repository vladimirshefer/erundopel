import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'
import { LanguageContextProvider } from './contexts/LanguageContext.tsx'
import CreateGamePage from './pages/CreateGamePage.tsx'
import GamePage from './pages/GamePage.tsx'
import MainPage from './pages/MainPage.tsx'
import RulesPage from './pages/RulesPage.tsx'

const queryClient = new QueryClient()

export default function App() {
  return (
    <LanguageContextProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div className="flex min-h-screen items-center justify-center bg-amber-300 p-4 sm:p-8">
            <Routes>
              <Route path="/" element={<MainPage />} />
              <Route path="/create" element={<CreateGamePage />} />
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
