import type { PlayerCredentialsDto } from './PlayerCredentialsDto.ts'

export interface ClientResponseDto {
  type: string
  credentials?: PlayerCredentialsDto
}
