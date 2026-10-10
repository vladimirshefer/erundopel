import type { GameStateSnapshotDto } from './GameStateSnapshotDto.ts'

export interface ClientStateUpdateDto {
  type: 'state'
  state: GameStateSnapshotDto
}
