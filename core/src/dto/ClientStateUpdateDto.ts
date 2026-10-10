import type { GameStateSnapshotDto } from './GameStateSnapshotDto.js'

export interface ClientStateUpdateDto {
  type: 'state'
  state: GameStateSnapshotDto
}
