import type { PlayerProfileDto } from '../dto/PlayerProfileDto.ts'

export interface PlayerProfileRepository {
  getProfile(): PlayerProfileDto | null
  saveProfile(profile: PlayerProfileDto): void
  deleteProfile(): void
}

export class LocalStoragePlayerProfileRepository implements PlayerProfileRepository {
  getProfile(): PlayerProfileDto | null {
    const name = localStorage.getItem('erundopel.playerProfile.name')?.trim()
    return name ? { name } : null
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
