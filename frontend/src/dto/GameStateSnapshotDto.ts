import type { AnswerOptionDto } from './AnswerOptionDto.ts'
import type { LobbyPlayerDto } from './LobbyPlayerDto.ts'
import type { PublicTaskDto } from './PublicTaskDto.ts'
import type { VoteDto } from './VoteDto.ts'

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
