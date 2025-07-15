export interface CreateGameRequestDto {
  roomId: string
}

export interface GameResponseDto {
  id: string
  roomId: string
  status: 'playing' | 'finished'
  winnerId: string | null
  createdAt: string
  updatedAt: string
}
