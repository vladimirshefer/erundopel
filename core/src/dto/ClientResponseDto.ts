import type { GameStateSnapshotDto } from './GameStateSnapshotDto.js'
import type { PlayerCredentialsDto } from './PlayerCredentialsDto.js'

interface ViewedClientResponseDto {
  type: 'viewed'
  state: GameStateSnapshotDto
}

interface SpectatingClientResponseDto {
  type: 'spectating'
  state: GameStateSnapshotDto
  credentials: PlayerCredentialsDto
}

interface JoinedClientResponseDto {
  type: 'joined'
  state: GameStateSnapshotDto
  credentials: PlayerCredentialsDto
}

interface ResumedClientResponseDto {
  type: 'resumed'
  state: GameStateSnapshotDto
}

interface StateClientResponseDto {
  type: 'state'
  state: GameStateSnapshotDto
}

interface LeftClientResponseDto {
  type: 'left'
}

export type ClientResponseDto =
  | ViewedClientResponseDto
  | SpectatingClientResponseDto
  | JoinedClientResponseDto
  | ResumedClientResponseDto
  | StateClientResponseDto
  | LeftClientResponseDto
