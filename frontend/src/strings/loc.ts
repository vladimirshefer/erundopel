import { useContext } from 'react'
import { LanguageContext } from '../contexts/LanguageContext.tsx'
import localeDefault from './locale_default.json'
import localeRu from './locale_ru.json'

const locales: Record<string, Record<string, string>> = {
  default: localeDefault,
  en: localeDefault,
  ru: localeRu,
}

export function useLoc(): (key: string) => string {
  const [language] = useContext(LanguageContext)
  return (key) => locales[language]?.[key] || locales.default[key] || key
}
