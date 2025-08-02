import { RoomRepository } from '#repositories/room_repository'
import { UserRepository } from '#repositories/user_repository'
import { CreateRoomDto, JoinRoomDto, RoomResponseDto, RoomPlayerDto } from '#dtos/room'
import { v4 as uuidv4 } from 'uuid'
import { Ws } from '#utils/ws'
import { GameService } from '#services/game_service'

export class RoomService {
  private repo = new RoomRepository()
  private userRepo = new UserRepository()
  private gameService = new GameService()

  async create(dto: CreateRoomDto, userId: string): Promise<RoomResponseDto> {
    const backgroundIndex = Math.floor(Math.random() * 6) + 1
    const room = await this.repo.createRoom({
      id: uuidv4(),
      name: dto.name,
      hostId: userId,
      status: 'waiting_players',
      backgroundIndex,
    })
    Ws.io.to('lobby').emit('room:updated')
    console.log('[SOCKET][EMIT] room:updated a lobby (create)')
    return this.roomToResponseDto(room, [])
  }

  async join(dto: JoinRoomDto, userId: string): Promise<RoomResponseDto> {
    const room = await this.repo.findRoomById(dto.roomId)
    if (!room) throw new Error('Sala no encontrada')
    if (userId === room.hostId) throw new Error('El anfitrión no puede unirse como jugador')
    const players = await this.repo.getPlayersInRoom(room.id)
    if (players.length >= 7) throw new Error('La sala está llena')
    if (players.some((p) => p.userId === userId)) throw new Error('Ya estás en la sala')
    const seatIndex = this.getNextSeatIndex(players)
    await this.repo.createPlayer(room.id, userId, seatIndex)
    const user = await this.userRepo.findById(userId)
    const userName = user?.name ?? 'Desconocido'

    Ws.io.to(room.id).emit('room:joined', { userName })
    console.log(`[SOCKET][EMIT] room:joined a sala ${room.id} (userName: ${userName})`)

    Ws.io.to('lobby').emit('room:updated')
    console.log('[SOCKET][EMIT] room:updated a lobby (join)')

    Ws.io.to(room.id).emit('room:updated')
    console.log(`[SOCKET][EMIT] room:updated a sala ${room.id} (join)`)

    const updatedPlayers = await this.repo.getPlayersInRoom(room.id)
    const playersDto = await Promise.all(updatedPlayers.map((p) => this.playerToDto(p)))
    return this.roomToResponseDto(room, playersDto)
  }

  async available(): Promise<RoomResponseDto[]> {
    const rooms = await this.repo.findAvailableRooms()
    const responses: RoomResponseDto[] = []
    for (const room of rooms) {
      const players = await this.repo.getPlayersInRoom(room.id)
      const playersDto = await Promise.all(players.map((p) => this.playerToDto(p)))
      responses.push(this.roomToResponseDto(room, playersDto))
    }
    return responses
  }

  async current(roomId: string): Promise<RoomResponseDto> {
    const room = await this.repo.findRoomById(roomId)
    if (!room) throw new Error('Sala no encontrada')
    const players = await this.repo.getPlayersInRoom(room.id)
    const playersDto = await Promise.all(players.map((p) => this.playerToDto(p)))
    return this.roomToResponseDto(room, playersDto)
  }

  // RoomService
  async start(roomId: string, userId: string): Promise<string> {
    const room = await this.repo.findRoomById(roomId)
    if (!room) throw new Error('Sala no encontrada')
    if (room.hostId !== userId) throw new Error('Solo el anfitrión puede iniciar')
    const players = await this.repo.getPlayersInRoom(room.id)
    if (players.length < 4) throw new Error('Mínimo 4 jugadores para iniciar')
    room.status = 'in_game'
    await room.save()
    // 5. CREAR EL JUEGO Y OBTENER ID
    const game = await this.gameService.createGame(room.id)
    // Notificar a clientes
    Ws.io.to(room.id).emit('room:started', { gameId: game.id })
    Ws.io.to('lobby').emit('room:updated')
    Ws.io.to(room.id).emit('room:updated')
    return game.id
  }

  private getNextSeatIndex(players: any[]): number {
    const taken = players.map((p) => p.seatIndex).sort((a, b) => a - b)
    for (let i = 0; i < 7; i++) {
      if (!taken.includes(i)) return i
    }
    return taken.length
  }

  private async playerToDto(player: any): Promise<RoomPlayerDto> {
    const user = await this.userRepo.findById(player.userId)
    return {
      id: player.userId,
      name: user?.name ?? 'Desconocido',
      seatIndex: player.seatIndex,
    }
  }

  async leave(roomId: string, userId: string): Promise<void> {
    const room = await this.repo.findRoomById(roomId)
    if (!room) throw new Error('Sala no encontrada')
    if (userId === room.hostId) throw new Error('El anfitrión no puede salir. Usa eliminar sala.')

    await this.repo.removePlayer(roomId, userId)
    const user = await this.userRepo.findById(userId)
    const userName = user?.name ?? 'Desconocido'
    Ws.io.to(roomId).emit('room:leave', { userName })
    console.log(`[SOCKET][EMIT] room:leave a sala ${roomId} (userName: ${userName})`)
    Ws.io.to('lobby').emit('room:updated')
    console.log('[SOCKET][EMIT] room:updated a lobby (leave)')
    Ws.io.to(roomId).emit('room:updated')
    console.log(`[SOCKET][EMIT] room:updated a sala ${roomId} (leave)`)
  }

  async delete(roomId: string, userId: string): Promise<void> {
    const room = await this.repo.findRoomById(roomId)
    if (!room) throw new Error('Sala no encontrada')
    if (room.hostId !== userId) throw new Error('Solo el anfitrión puede eliminar la sala')

    await this.repo.deleteRoom(roomId)
    Ws.io.to(roomId).emit('room:deleted', { message: 'El anfitrión eliminó la sala.' })
    console.log(`[SOCKET][EMIT] room:deleted a sala ${roomId}`)
    Ws.io.to('lobby').emit('room:updated')
    console.log('[SOCKET][EMIT] room:updated a lobby (delete)')
  }

  private roomToResponseDto(room: any, players: RoomPlayerDto[]): RoomResponseDto {
    return {
      id: room.id,
      name: room.name,
      hostId: room.hostId,
      status: room.status,
      players,
      backgroundIndex: room.backgroundIndex,
    }
  }
}
