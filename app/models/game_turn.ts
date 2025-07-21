import { DateTime } from 'luxon'
import { BaseModel, column, beforeCreate } from '@adonisjs/lucid/orm'
import { v4 as uuidv4 } from 'uuid'

export default class GameTurn extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare gameId: string

  @column()
  declare playerId: string

  @column()
  declare turnNumber: number

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
  declare sequenceInput: { x: number; y: number; hex: string }[]

  @column()
  declare isCorrect: boolean

  @column()
  declare isTurnFinished: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @beforeCreate()
  static assignUuid(turn: GameTurn) {
    turn.id = uuidv4()
  }
}
