import { RoomRepository } from '#repositories/room_repository'
import { GameRepository } from '#repositories/game_repository'
import type { CreateRoomRequestDto, RoomResponseDto, RoomStartResponseDto } from '#dtos/room'
import Room from '#models/room'
import { GameTurnRepository } from '#repositories/game_turn_repository'
import User from '#models/user'
import Game from '#models/game'

export class RoomService {
  private repo = new RoomRepository()
  private gameRepo = new GameRepository()
  private turnRepo = new GameTurnRepository()

  // Crear sala
  async createRoom(data: CreateRoomRequestDto, userId: string): Promise<RoomResponseDto> {
    const room = await this.repo.create(data, userId)
    return await this.toResponse(room)
  }

  // Unirse a sala
  async joinRoom(roomId: string, userId: string): Promise<RoomResponseDto | null> {
    const room = await this.repo.joinRoom(roomId, userId)
    return room ? await this.toResponse(room) : null
  }

  // Listar salas esperando
  async getWaitingRooms(): Promise<RoomResponseDto[]> {
    const rooms = await this.repo.findWaitingRooms()
    // Espera todas las respuestas de toResponse, ya que es async
    return await Promise.all(rooms.map((room) => this.toResponse(room)))
  }

  // Obtener estado de sala
  async getRoomStatus(roomId: string): Promise<RoomResponseDto | null> {
    const room = await this.repo.getRoomStatus(roomId)
    return room ? await this.toResponse(room) : null
  }

  // Iniciar sala/partida (solo host)
  async startRoom(roomId: string, userId: string): Promise<RoomStartResponseDto | null> {
    const room = await this.repo.findById(roomId)
    if (!room) throw new Error('Sala no encontrada')

    if (room.hostPlayerId !== userId) throw new Error('No autorizado: solo el host puede iniciar')
    if (!room.hostPlayerId || !room.secondPlayerId)
      throw new Error('La sala debe tener dos jugadores')
    if (room.status !== 'waiting') throw new Error('La partida ya está iniciada o finalizada')

    room.status = 'playing'
    await room.save()

    const game = await this.gameRepo.create({
      roomId: room.id,
      currentSequence: [],
    })

    await this.turnRepo.create({
      gameId: game.id,
      playerId: room.hostPlayerId,
      turnNumber: 1,
      sequenceInput: [],
      isCorrect: true,
      isTurnFinished: false,
    })

    // Espera la respuesta con los nombres de usuario ya integrados
    const roomResponse = await this.toResponse(room)
    return {
      ...roomResponse,
      gameId: game.id,
    }
  }

  async leaveRoom(roomId: string, userId: string): Promise<RoomResponseDto> {
    const room = await this.repo.findById(roomId)
    if (!room) throw new Error('Sala no encontrada')

    if (room.secondPlayerId !== userId) {
      throw new Error('Solo el jugador 2 puede abandonar la sala')
    }

    room.secondPlayerId = null
    room.status = 'waiting'
    await room.save()

    return this.toResponse(room)
  }

  async cancelRoom(roomId: string, userId: string): Promise<void> {
    const room = await this.repo.findById(roomId)
    if (!room) throw new Error('Sala no encontrada')

    if (room.hostPlayerId !== userId) {
      throw new Error('Solo el anfitrión puede cancelar la sala')
    }

    await this.repo.delete(room.id)
  }

  async toResponse(room: Room): Promise<RoomResponseDto & { gameId?: string }> {
    const hostUser = await User.find(room.hostPlayerId)
    const secondUser = room.secondPlayerId ? await User.find(room.secondPlayerId) : null

    let gameId: string | undefined

    // Solo busca gameId si está en playing
    if (room.status === 'playing') {
      const game = await Game.query()
        .where('room_id', room.id)
        .orderBy('created_at', 'desc')
        .first()
      if (game) {
        gameId = game.id
      }
    }

    return {
      id: room.id,
      name: room.name,
      hostPlayerId: room.hostPlayerId,
      hostPlayerName: hostUser?.name ?? 'Anónimo',
      secondPlayerId: room.secondPlayerId,
      secondPlayerName: secondUser?.name ?? null,
      status: room.status,
      colorsConfig: room.colorsConfig,
      cantidadColores: room.cantidadColores,
      createdAt: room.createdAt.toISO() || '',
      updatedAt: room.updatedAt.toISO() || '',
      ...(gameId ? { gameId } : {}),
    }
  }
}
