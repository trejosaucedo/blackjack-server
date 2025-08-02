import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { v4 as uuidv4 } from 'uuid'

export default class RoomPlayer extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare roomId: string

  @column()
  declare userId: string

  @column()
  declare seatIndex: number

  @beforeCreate()
  static assignUuid(roomPlayer: RoomPlayer) {
    roomPlayer.id = uuidv4()
  }
}
