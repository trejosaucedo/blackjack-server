import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'game_turns'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.uuid('game_id').notNullable().references('id').inTable('games').onDelete('CASCADE')
      table.uuid('player_id').notNullable().references('id').inTable('users')
      table.integer('turn_number').notNullable()
      table.json('sequence_input').notNullable()
      table.boolean('is_correct').notNullable()
      table.boolean('is_turn_finished').notNullable().defaultTo(false)
      table.timestamp('created_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
