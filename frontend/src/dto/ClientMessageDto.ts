import type { TaskDto } from './TaskDto.ts'
import type { TextAnswerDto } from './TextAnswerDto.ts'

interface ViewClientMessageDto {
  type: 'view'
  code: string
}

interface SpectateClientMessageDto {
  type: 'spectate'
  code: string
  playerName: string
}

interface JoinClientMessageDto {
  type: 'join'
  playerName: string
}

interface ReconnectClientMessageDto {
  type: 'reconnect'
  code: string
  playerId: string
}

interface LeaveClientMessageDto {
  type: 'leave'
}

interface CloseLobbyClientMessageDto {
  type: 'closeLobby'
}

interface StartTaskClientMessageDto {
  type: 'startTask'
  task: TaskDto
}

interface SubmitAnswerClientMessageDto {
  type: 'submitAnswer'
  answer: TextAnswerDto
}

interface VoteClientMessageDto {
  type: 'vote'
  answerId: string
}

interface NextTaskClientMessageDto {
  type: 'nextTask'
  task: TaskDto
}

export type ClientMessageDto =
  | ViewClientMessageDto
  | SpectateClientMessageDto
  | JoinClientMessageDto
  | ReconnectClientMessageDto
  | LeaveClientMessageDto
  | CloseLobbyClientMessageDto
  | StartTaskClientMessageDto
  | SubmitAnswerClientMessageDto
  | VoteClientMessageDto
  | NextTaskClientMessageDto
