export interface CreateRoomRequestDto {
  name: string
  colorsConfig: { x: number; y: number; hex: string }[]
  cantidadColores: number
}

export interface RoomStartResponseDto extends RoomResponseDto {
  gameId: string
}

export interface RoomResponseDto {
  id: string
  name: string
  hostPlayerId: string
  secondPlayerId: string | null
  status: 'waiting' | 'playing' | 'finished' | 'canceled'
  colorsConfig: { x: number; y: number; hex: string }[]
  cantidadColores: number
  createdAt: string
  updatedAt: string
}
