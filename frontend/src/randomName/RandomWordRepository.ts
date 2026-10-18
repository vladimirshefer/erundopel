function resolveLanguage(): string {
  const supportedLanguages = ['en', 'ru', 'de', 'es']
  const storedLanguage = localStorage.getItem('erundopel.language') ?? ''
  if (supportedLanguages.includes(storedLanguage)) return storedLanguage
  const browserLanguage = navigator.language.slice(0, 2)
  if (supportedLanguages.includes(browserLanguage)) return browserLanguage
  return 'en'
}

function pickRandom(words: string[]): string {
  return words[Math.floor(Math.random() * words.length)]
}

const wordsCache = new Map<string, Promise<string[]>>()

async function fetchWords(fileName: string): Promise<string[]> {
  let words = wordsCache.get(fileName)
  if (!words) {
    words = fetch(`/words/${fileName}`)
      .then((response) => response.text())
      .then((text) => text.split('\n').map((word) => word.trim()).filter(Boolean))
    wordsCache.set(fileName, words)
  }
  return words
}

export interface RandomWordRepository {
  getRandomNoun(): Promise<string>
  getRandomAdjective(): Promise<string>
}

export class FetchRandomWordRepository implements RandomWordRepository {
  async getRandomNoun(): Promise<string> {
    return pickRandom(await fetchWords(`nouns_${resolveLanguage()}.txt`))
  }

  async getRandomAdjective(): Promise<string> {
    return pickRandom(await fetchWords(`adjectives_${resolveLanguage()}.txt`))
  }
}

const randomWordRepository = new FetchRandomWordRepository()

export default randomWordRepository
