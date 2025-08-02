import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import RoomPlayer from './room_player.js'
import * as relations from '@adonisjs/lucid/types/relations'

export default class Room extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare hostId: string

  @column()
  declare status: 'waiting_players' | 'waiting_start' | 'full' | 'in_game' | 'ended'

  @column()
  declare backgroundIndex: number

  @hasMany(() => RoomPlayer)
  declare players: relations.HasMany<typeof RoomPlayer>
}
