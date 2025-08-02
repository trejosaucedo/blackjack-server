import { BaseModel, beforeCreate, column, hasMany } from '@adonisjs/lucid/orm'
import Round from './round.js'
import * as relations from '@adonisjs/lucid/types/relations'
import { v4 as uuidv4 } from 'uuid'

export default class Game extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare roomId: string

  @column()
  declare status: 'in_progress' | 'between_rounds' | 'ended'

  @hasMany(() => Round)
  declare rounds: relations.HasMany<typeof Round>

  @beforeCreate()
  static assignUuid(game: Game) {
    game.id = uuidv4()
  }
}
