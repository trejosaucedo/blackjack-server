import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'games'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.uuid('room_id').notNullable().references('id').inTable('rooms').onDelete('CASCADE')
      table.enum('status', ['playing', 'finished']).notNullable().defaultTo('playing')
      table.uuid('winner_id').nullable().references('id').inTable('users')
      table.json('current_sequence').notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
