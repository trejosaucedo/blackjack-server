import Room from '#models/room'
import RoomPlayer from '#models/room_player'

export class RoomRepository {
  async createRoom(data: Partial<Room>) {
    return Room.create(data)
  }

  async findAvailableRooms() {
    return Room.query().whereIn('status', ['waiting_players', 'waiting_start', 'full'])
  }

  async findRoomById(id: string) {
    return Room.find(id)
  }

  async createPlayer(roomId: string, userId: string, seatIndex: number) {
    return RoomPlayer.create({ roomId, userId, seatIndex })
  }

  async getPlayersInRoom(roomId: string) {
    return RoomPlayer.query().where('roomId', roomId)
  }

  async removePlayer(roomId: string, userId: string) {
    await RoomPlayer.query().where('roomId', roomId).andWhere('userId', userId).delete()
  }

  async deleteRoom(roomId: string) {
    await RoomPlayer.query().where('roomId', roomId).delete()
    await Room.query().where('id', roomId).delete()
  }
}
