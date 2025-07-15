import { RoomRepository } from '#repositories/room_repository'
import { GameRepository } from '#repositories/game_repository'
import type { CreateRoomRequestDto, RoomResponseDto, RoomStartResponseDto } from '#dtos/room'
import Room from '#models/room'
import { GameTurnRepository } from '#repositories/game_turn_repository'

export class RoomService {
  private repo = new RoomRepository()
  private gameRepo = new GameRepository()
  private turnRepo = new GameTurnRepository()

  async createRoom(data: CreateRoomRequestDto, userId: string): Promise<RoomResponseDto> {
    const room = await this.repo.create(data, userId)
    return this.toResponse(room)
  }

  async joinRoom(roomId: string, userId: string): Promise<RoomResponseDto | null> {
    const room = await this.repo.joinRoom(roomId, userId)
    return room ? this.toResponse(room) : null
  }

  async getWaitingRooms(): Promise<RoomResponseDto[]> {
    const rooms = await this.repo.findWaitingRooms()
    return rooms.map(this.toResponse)
  }

  async getRoomStatus(roomId: string): Promise<RoomResponseDto | null> {
    const room = await this.repo.getRoomStatus(roomId)
    return room ? this.toResponse(room) : null
  }

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

    const roomResponse = this.toResponse(room)
    return {
      ...roomResponse,
      gameId: game.id,
    }
  }

  toResponse(room: Room): RoomResponseDto {
    return {
      id: room.id,
      name: room.name,
      hostPlayerId: room.hostPlayerId,
      secondPlayerId: room.secondPlayerId,
      status: room.status,
      colorsConfig: room.colorsConfig,
      cantidadColores: room.cantidadColores,
      createdAt: room.createdAt.toISO() || '',
      updatedAt: room.updatedAt.toISO() || '',
    }
  }
}
