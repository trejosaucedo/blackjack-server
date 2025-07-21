import Room from '#models/room'
import type { CreateRoomRequestDto } from '#dtos/room'

export class RoomRepository {
  async create(data: CreateRoomRequestDto, hostPlayerId: string): Promise<Room> {
    return Room.create({
      cantidadColores: data.cantidadColores,
      colorsConfig: data.colorsConfig,
      hostPlayerId,
      name: data.name,
      status: 'waiting',
    })
  }

  async findById(id: string): Promise<Room | null> {
    return Room.find(id)
  }

  async findWaitingRooms(): Promise<Room[]> {
    return Room.query().where('status', 'waiting').exec()
  }

  async joinRoom(id: string, userId: string): Promise<Room | null> {
    const room = await Room.find(id)
    if (!room || room.secondPlayerId || room.hostPlayerId === userId) return null

    room.secondPlayerId = userId
    await room.save()
    return room
  }

  async getRoomStatus(roomId: string): Promise<Room | null> {
    return Room.query().where('id', roomId).preload('hostPlayer').preload('secondPlayer').first()
  }

  async startRoom(id: string, userId: string): Promise<Room | null> {
    const room = await Room.find(id)
    if (!room) return null

    if (room.hostPlayerId !== userId) return null

    if (!room.secondPlayerId) return null

    room.status = 'playing'
    await room.save()
    return room
  }

  async delete(id: string): Promise<void> {
    await Room.query().where('id', id).delete()
  }
}
