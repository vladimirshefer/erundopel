import type { TaskDto } from './TaskDto.js'
import type { TextAnswerDto } from './TextAnswerDto.js'

interface ViewLobbyCommandDto {
  type: 'view'
}

interface SpectateLobbyCommandDto {
  type: 'spectate'
  playerName: string
}

interface JoinLobbyCommandDto {
  type: 'join'
  playerName: string
  playerId?: string
}

interface ReconnectLobbyCommandDto {
  type: 'reconnect'
  playerId: string
}

interface DisconnectLobbyCommandDto {
  type: 'disconnect'
  playerId: string
}

interface LeaveLobbyCommandDto {
  type: 'leave'
  playerId: string
}

interface CloseLobbyCommandDto {
  type: 'close'
  playerId: string
}

interface StartTaskLobbyCommandDto {
  type: 'startTask'
  playerId: string
  task: TaskDto
}

interface SubmitAnswerLobbyCommandDto {
  type: 'submitAnswer'
  playerId: string
  answer: TextAnswerDto
}

interface VoteLobbyCommandDto {
  type: 'vote'
  playerId: string
  answerId: string
}

interface NextTaskLobbyCommandDto {
  type: 'nextTask'
  playerId: string
  task: TaskDto
}

export type LobbyCommandDto =
  | ViewLobbyCommandDto
  | SpectateLobbyCommandDto
  | JoinLobbyCommandDto
  | ReconnectLobbyCommandDto
  | DisconnectLobbyCommandDto
  | LeaveLobbyCommandDto
  | CloseLobbyCommandDto
  | StartTaskLobbyCommandDto
  | SubmitAnswerLobbyCommandDto
  | VoteLobbyCommandDto
  | NextTaskLobbyCommandDto
