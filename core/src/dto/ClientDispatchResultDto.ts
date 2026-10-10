import type { ClientResponseDto } from './ClientResponseDto.js'
import type { ClientSessionDto } from './ClientSessionDto.js'
import type { GameStateSnapshotDto } from './GameStateSnapshotDto.js'

export interface ClientDispatchResultDto {
  state: GameStateSnapshotDto
  response?: ClientResponseDto
  nextSession?: ClientSessionDto
  viewCode?: string
  detach?: true
}
