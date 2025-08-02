import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'rounds'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.uuid('game_id').notNullable().references('games.id').onDelete('CASCADE')
      table.enum('status', ['in_progress', 'ended']).notNullable()
      table.json('deck').notNullable()
      table.integer('turn_seat_index').notNullable()
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
