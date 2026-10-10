export type DictionaryDto = {
  id: string
  name: string
  language: string
  numberOfWords?: number
}

export type DictionaryContentDto = {
  id: string
  text: string
  correctAnswer: { text: string }
}[]

export interface DictionaryRepository {
  getDictionaries(): DictionaryDto[]
  getDictionaryContent(id: string): Promise<DictionaryContentDto>
}

export class DictionaryRepositoryImpl implements DictionaryRepository {
  getDictionaries() {
    return [
      { id: 'en', name: 'English', language: 'en', numberOfWords: 15 },
      { id: 'ru', name: 'Русский', language: 'ru', numberOfWords: 15 },
      { id: 'de', name: 'Deutsch', language: 'de', numberOfWords: 15 },
      { id: 'es', name: 'Español', language: 'es', numberOfWords: 15 },
      { id: 'klingon', name: 'Klingon', language: 'tlh', numberOfWords: 10 },
    ]
  }

  async getDictionaryContent(id: string) {
    const response = await fetch(`/dictionaries/${id}.json`)
    if (!response.ok) throw new Error('Could not load dictionary')
    return (await response.json()) as DictionaryContentDto
  }
}

const dictionaryRepository = new DictionaryRepositoryImpl()

export default dictionaryRepository
