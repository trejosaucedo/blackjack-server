import { DateTime } from 'luxon'
import { BaseModel, column, beforeCreate } from '@adonisjs/lucid/orm'
import { v4 as uuidv4 } from 'uuid'

export default class Game extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare roomId: string

  @column()
  declare status: 'playing' | 'finished'

  @column()
  declare winnerId: string | null

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
  declare currentSequence: { x: number; y: number; hex: string }[]

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static assignUuid(game: Game) {
    game.id = uuidv4()
  }
}
