import { useState, type ReactNode } from 'react'
import { LanguageContext, type Language } from './LanguageContext.ts'

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const storedLanguage = localStorage.getItem('erundopel.language')
    return storedLanguage === 'ru' || navigator.language.startsWith('ru')
      ? 'ru'
      : 'en'
  })

  return (
    <LanguageContext.Provider value={[language, setLanguage]}>
      {children}
    </LanguageContext.Provider>
  )
}
