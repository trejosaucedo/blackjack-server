export interface CreateGameRequestDto {
  roomId: string
  currentSequence: {
    x: number
    y: number
    hex: string
  }[]
}

export interface RoomDto {
  id: string
  name: string
  hostPlayerId: string
  hostPlayerName: string
  secondPlayerId: string | null
  secondPlayerName: string | null
  status: 'waiting' | 'playing' | 'finished' | 'canceled'
  colorsConfig: { x: number; y: number; hex: string }[]
  cantidadColores: number
  createdAt: string
  updatedAt: string
}

export interface GameResponseDto {
  id: string
  room: RoomDto
  status: 'playing' | 'finished'
  winnerId: string | null
  currentSequence: { x: number; y: number; hex: string }[]
  createdAt: string
  updatedAt: string
}
