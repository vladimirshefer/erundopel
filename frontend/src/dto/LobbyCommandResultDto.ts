import type { GameStateSnapshotDto } from './GameStateSnapshotDto.ts'
import type { PlayerCredentialsDto } from './PlayerCredentialsDto.ts'

export interface LobbyCommandResultDto {
  state: GameStateSnapshotDto
  credentials?: PlayerCredentialsDto
  evictedCode?: string
}
