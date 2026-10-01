import { useContext } from 'react'
import localeEn from './en.json'
import localeRu from './ru.json'
import { LanguageContext } from './LanguageContext.ts'

const locales: Record<string, Record<string, string>> = {
  en: localeEn,
  ru: localeRu,
}

export function useLoc(): (key: string) => string {
  const [language] = useContext(LanguageContext)
  return (key) => locales[language]?.[key] ?? locales.en[key] ?? key
}
