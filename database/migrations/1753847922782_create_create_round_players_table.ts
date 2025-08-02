import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'round_players'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.uuid('round_id').notNullable().references('rounds.id').onDelete('CASCADE')
      table.uuid('user_id').notNullable()
      table.json('cartas').notNullable() // [{ valor: 'A', valorNumerico: 1, palo: 'picas' }]
      table.enum('state', ['jugando', 'plantado', 'bust', 'bj']).notNullable()
      table.integer('puntos').notNullable()
      table.boolean('ganador').notNullable().defaultTo(false)
      table.timestamp('created_at', { useTz: true })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
