import randomWordRepository from '../randomName/RandomWordRepository.ts'
import type { PlayerProfileDto } from '../dto/PlayerProfileDto.ts'

export interface PlayerProfileRepository {
  getProfile(): Promise<PlayerProfileDto | null>
  saveProfile(profile: PlayerProfileDto): void
  deleteProfile(): void
}

export class LocalStoragePlayerProfileRepository implements PlayerProfileRepository {
  async getProfile(): Promise<PlayerProfileDto | null> {
    const name = localStorage.getItem('erundopel.playerProfile.name')?.trim()
    if (name) return { name }
    const randomName = `${await randomWordRepository.getRandomAdjective()} ${await randomWordRepository.getRandomNoun()}`
    this.saveProfile({ name: randomName })
    return { name: randomName }
  }

  saveProfile(profile: PlayerProfileDto) {
    localStorage.setItem('erundopel.playerProfile.name', profile.name)
  }

  deleteProfile() {
    localStorage.removeItem('erundopel.playerProfile.name')
  }
}

const playerProfileRepository = new LocalStoragePlayerProfileRepository()

export default playerProfileRepository
