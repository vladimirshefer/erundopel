import { useContext } from 'react'
import { LanguageContext } from '../contexts/LanguageContext.tsx'
import dictionaryRepository from '../repositories/DictionaryRepository.ts'
import { useLoc } from '../strings/loc.ts'

export default function LanguageSelector() {
  const loc = useLoc()
  const [language, setLanguage] = useContext(LanguageContext)
  const dictionaries = dictionaryRepository.getDictionaries()

  return (
    <label className="fixed top-4 right-4 z-10 border-2 border-zinc-950 bg-white px-2 py-1 text-sm font-bold text-zinc-950 shadow-lg">
      <span className="sr-only">{loc('Language')}</span>
      <select
        aria-label={loc('Language')}
        className="bg-white outline-none"
        onChange={(event) => setLanguage(event.target.value)}
        value={language}
      >
        {dictionaries.map((dictionary) => (
          <option key={dictionary.id} value={dictionary.language}>
            {dictionary.name}
          </option>
        ))}
      </select>
    </label>
  )
}
