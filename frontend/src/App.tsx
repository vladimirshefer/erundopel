import { Route, Routes } from 'react-router'
import { RulesPage } from './pages/rulesPage.tsx'
import { StartPage } from './pages/startPage.tsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<StartPage />} />
      <Route path="/rules" element={<RulesPage />} />
      <Route path="*" element={<StartPage />} />
    </Routes>
  )
}

export default App
