import type { TextAnswerDto } from './TextAnswerDto.ts'

export interface TaskDto {
  text: string
  correctAnswer: TextAnswerDto
  wrongAnswers: TextAnswerDto[]
}
