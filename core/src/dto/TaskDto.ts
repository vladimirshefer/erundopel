import type { TextAnswerDto } from './TextAnswerDto.js'

export interface TaskDto {
  text: string
  correctAnswer: TextAnswerDto
  wrongAnswers: TextAnswerDto[]
}
