import type { GameStateSnapshotDto } from './GameStateSnapshotDto.js'
import type { PlayerCredentialsDto } from './PlayerCredentialsDto.js'

export interface LobbyCommandResultDto {
  state: GameStateSnapshotDto
  credentials?: PlayerCredentialsDto
  evictedCode?: string
}
