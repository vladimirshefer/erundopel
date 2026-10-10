import type { DictionaryContentDto } from '../dto/DictionaryContentDto.ts'
import type { DictionaryDto } from '../dto/DictionaryDto.ts'

export interface DictionaryRepository {
  getDictionaries(): DictionaryDto[]
  getDictionaryContent(id: string): Promise<DictionaryContentDto>
}

export class DictionaryRepositoryImpl implements DictionaryRepository {
  getDictionaries(): DictionaryDto[] {
    return [
      { id: 'en', name: 'English', language: 'en', numberOfWords: 15 },
      { id: 'ru', name: 'Русский', language: 'ru', numberOfWords: 15 },
      { id: 'de', name: 'Deutsch', language: 'de', numberOfWords: 15 },
      { id: 'es', name: 'Español', language: 'es', numberOfWords: 15 },
      { id: 'klingon', name: 'Klingon', language: 'tlh', numberOfWords: 10 },
    ] satisfies DictionaryDto[]
  }

  async getDictionaryContent(id: string): Promise<DictionaryContentDto> {
    const response = await fetch(`/dictionaries/${id}.json`)
    if (!response.ok) throw new Error('Could not load dictionary')
    return (await response.json()) as DictionaryContentDto
  }
}

const dictionaryRepository = new DictionaryRepositoryImpl()

export default dictionaryRepository
