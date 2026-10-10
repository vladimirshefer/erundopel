export interface ClientErrorResponseDto {
  type: 'error'
  error: {
    code: string
    message: string
  }
}
