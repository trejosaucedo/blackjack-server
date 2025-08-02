export interface CreateRoomDto {
  name: string
}

export interface JoinRoomDto {
  roomId: string
}

export interface RoomPlayerDto {
  id: string
  name: string
  seatIndex: number
}

export interface RoomResponseDto {
  id: string
  name: string
  hostId: string
  status: 'waiting_players' | 'waiting_start' | 'full' | 'in_game' | 'ended'
  players: RoomPlayerDto[]
  backgroundIndex: number
}
