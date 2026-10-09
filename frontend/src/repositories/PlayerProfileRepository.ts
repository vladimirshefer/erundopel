export type PlayerProfile = {
  name: string
}

export interface PlayerProfileRepository {
  getProfile(): PlayerProfile | null
  saveProfile(profile: PlayerProfile): void
  deleteProfile(): void
}

export class LocalStoragePlayerProfileRepository implements PlayerProfileRepository {
  getProfile(): PlayerProfile | null {
    const name = localStorage.getItem('erundopel.playerProfile.name')?.trim()
    return name ? { name } : null
  }

  saveProfile(profile: PlayerProfile) {
    localStorage.setItem('erundopel.playerProfile.name', profile.name)
  }

  deleteProfile() {
    localStorage.removeItem('erundopel.playerProfile.name')
  }
}

const playerProfileRepository = new LocalStoragePlayerProfileRepository()

export default playerProfileRepository
