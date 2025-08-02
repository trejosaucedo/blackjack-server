import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { v4 as uuidv4 } from 'uuid'

export default class RoundPlayer extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare roundId: string

  @column()
  declare userId: string

  @column()
  declare cartas: any // Array<{ valor: string, valorNumerico: number, palo: string }>

  @column()
  declare state: 'jugando' | 'plantado' | 'bust' | 'bj'

  @column()
  declare puntos: number

  @column()
  declare ganador: boolean

  @beforeCreate()
  static assignUuid(rp: RoundPlayer) {
    rp.id = uuidv4()
  }
}
