export interface Card {
  valor: string // "A", "2", ..., "10", "J", "Q", "K"
  valorNumerico: number // 1-13
  palo: string // "corazones", "picas", "tréboles", "diamantes"
}

export interface CreateGameDto {
  roomId: string
}

export interface GameResponseDto {
  id: string
  roomId: string
  status: 'in_progress' | 'between_rounds' | 'ended'
  currentRound: RoundResponseDto | null
  hostId: string
}

export interface RoundResponseDto {
  id: string
  gameId: string
  status: 'in_progress' | 'ended'
  deckCount: number
  turnSeatIndex: number
  players: RoundPlayerResponseDto[]
  hostId: string
}

export interface RoundPlayerResponseDto {
  userId: string
  cartas: Card[]
  state: 'jugando' | 'plantado' | 'bust' | 'bj'
  puntos: number
  ganador: boolean
  nombre: string // Para mostrar nombres en la vista
}
