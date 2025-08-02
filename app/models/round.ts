import { BaseModel, beforeCreate, column, hasMany } from '@adonisjs/lucid/orm'
import RoundPlayer from './round_player.js'
import * as relations from '@adonisjs/lucid/types/relations'
import { v4 as uuidv4 } from 'uuid'
import { DateTime } from 'luxon'

export default class Round extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare gameId: string

  @column()
  declare status: 'in_progress' | 'ended'

  @column()
  declare deck: any // Array<{ valor: string, valorNumerico: number, palo: string }>

  @column()
  declare turnSeatIndex: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => RoundPlayer)
  declare roundPlayers: relations.HasMany<typeof RoundPlayer>

  @beforeCreate()
  static assignUuid(round: Round) {
    round.id = uuidv4()
  }
}
