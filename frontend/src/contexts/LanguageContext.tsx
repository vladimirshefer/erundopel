import { createContext, useState, type ReactNode } from 'react'
import dictionaryRepository from '../repositories/DictionaryRepository.ts'

export type Language = string
const languages = dictionaryRepository.getDictionaries().map(
  (dictionary) => dictionary.language,
)

export const LanguageContext = createContext<
  [Language, (language: Language) => void]
>(['en', () => undefined])

export function LanguageContextProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState(() => {
    const storedLanguage = localStorage.getItem('erundopel.language') ?? ''
    const browserLanguage = navigator.language.slice(0, 2)
    if (languages.includes(storedLanguage)) return storedLanguage
    if (languages.includes(browserLanguage)) return browserLanguage
    return 'en'
  })
  return (
    <LanguageContext.Provider
      value={[
        language,
        (nextLanguage) => {
          setLanguage(nextLanguage)
          localStorage.setItem('erundopel.language', nextLanguage)
        },
      ]}
    >
      {children}
    </LanguageContext.Provider>
  )
}
