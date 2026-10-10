import type { TaskDto } from "./TaskDto.js";
import type { TextAnswerDto } from "./TextAnswerDto.js";

export interface ClientMessageDto<T> {
  type: string;
  body: T;
}

export interface ViewClientMessageDto {
  code: string;
}

export interface SpectateClientMessageDto {
  code: string;
  playerName: string;
}

export interface JoinClientMessageDto {
  playerName: string;
}

export interface ReconnectClientMessageDto {
  code: string;
  playerId: string;
}

export interface LeaveClientMessageDto {}

export interface CloseLobbyClientMessageDto {}

export interface StartTaskClientMessageDto {
  task: TaskDto;
}

export interface SubmitAnswerClientMessageDto {
  answer: TextAnswerDto;
}

export interface VoteClientMessageDto {
  answerId: string;
}

export interface NextTaskClientMessageDto {
  task: TaskDto;
}
