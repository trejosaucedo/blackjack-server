import { DateTime } from 'luxon'
import { BaseModel, column, beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import { v4 as uuidv4 } from 'uuid'
import User from './user.js'
import * as relations from '@adonisjs/lucid/types/relations'

export default class Room extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare hostPlayerId: string

  @column()
  declare secondPlayerId: string | null

  @belongsTo(() => User, { foreignKey: 'hostPlayerId' })
  declare hostPlayer: relations.BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'secondPlayerId' })
  declare secondPlayer: relations.BelongsTo<typeof User>

  @column()
  declare status: 'waiting' | 'playing' | 'finished' | 'canceled'

  @column({
    prepare: (value: { x: number; y: number; hex: string }[]) => JSON.stringify(value),
    consume: (value: any) => {
      if (typeof value === 'object' && value !== null) return value
      try {
        return JSON.parse(value)
      } catch {
        return []
      }
    },
  })
  declare colorsConfig: { x: number; y: number; hex: string }[]

  @column()
  declare cantidadColores: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static assignUuid(room: Room) {
    room.id = uuidv4()
  }
}
