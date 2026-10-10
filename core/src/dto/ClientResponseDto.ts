import type { PlayerCredentialsDto } from './PlayerCredentialsDto.js'

export interface ClientResponseDto {
  type: string
  credentials?: PlayerCredentialsDto
}
