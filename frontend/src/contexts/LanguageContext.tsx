import { createContext, useState, type ReactNode } from 'react'

export const LanguageContext = createContext<
  [string, (language: string) => void]
>(['en', () => undefined])

export function LanguageContextProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState(
    localStorage.getItem('erundopel.language') ||
      navigator.language.slice(0, 2),
  )
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
