import { createContext, type Dispatch, type SetStateAction } from 'react'

export type Language = 'en' | 'ru'

export const LanguageContext = createContext<
  readonly [Language, Dispatch<SetStateAction<Language>>]
>(['en', () => undefined])
