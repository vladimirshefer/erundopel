import type { AnswerOptionDto } from './AnswerOptionDto.js'
import type { LobbyPlayerDto } from './LobbyPlayerDto.js'
import type { PublicTaskDto } from './PublicTaskDto.js'
import type { VoteDto } from './VoteDto.js'

export type GamePhaseDto = 'lobby' | 'answering' | 'voting' | 'results'

export interface GameStateSnapshotDto {
  code: string
  ownerPlayerId: string
  createdAt: number
  revision: number
  closed: boolean
  phase: GamePhaseDto
  task?: PublicTaskDto
  answerOptions?: AnswerOptionDto[]
  correctAnswerId?: string
  votes?: VoteDto[]
  players: LobbyPlayerDto[]
  spectators: LobbyPlayerDto[]
}
