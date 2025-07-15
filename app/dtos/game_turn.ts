export interface CreateGameTurnRequestDto {
  gameId: string
  sequenceInput: { x: number; y: number; hex: string }[]
}

export interface GameTurnResponseDto {
  id: string
  gameId: string
  playerId: string
  turnNumber: number
  sequenceInput: { x: number; y: number; hex: string }[]
  isCorrect: boolean
  isTurnFinished: boolean
  createdAt: string
}

export interface GameTurnCreateInternalDto {
  gameId: string
  playerId: string
  sequenceInput: { x: number; y: number; hex: string }[]
  turnNumber: number
  isCorrect: boolean
  isTurnFinished: boolean
}
