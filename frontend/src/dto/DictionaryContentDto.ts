export interface DictionaryEntryDto {
  id: string
  text: string
  correctAnswer: {
    text: string
  }
}

export interface DictionaryContentDto extends Array<DictionaryEntryDto> {}
