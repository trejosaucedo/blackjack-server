import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'room_players'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.uuid('room_id').notNullable().references('rooms.id').onDelete('CASCADE')
      table.uuid('user_id').notNullable()
      table.integer('seat_index').notNullable()
      table.timestamp('created_at', { useTz: true })
      table.unique(['room_id', 'user_id'])
      table.unique(['room_id', 'seat_index'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
