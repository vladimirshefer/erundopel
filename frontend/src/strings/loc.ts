import { useContext } from 'react'
import { LanguageContext } from '../contexts/LanguageContext.tsx'
import localeEn from './locale_en.json'
import localeDe from './locale_de.json'
import localeRu from './locale_ru.json'
import localeEs from './locale_es.json'

const locales: Record<string, Record<string, string>> = {
  en: localeEn,
  de: localeDe,
  ru: localeRu,
  es: localeEs,
}

export function useLoc(): (key: string) => string {
  const [language] = useContext(LanguageContext)
  return (key) => locales[language]?.[key] || locales.en[key] || key
}
