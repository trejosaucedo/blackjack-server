import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'rooms'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('name').notNullable()
      table.uuid('host_player_id').notNullable().references('id').inTable('users')
      table.uuid('second_player_id').nullable().references('id').inTable('users')
      table
        .enum('status', ['waiting', 'playing', 'finished', 'canceled'])
        .notNullable()
        .defaultTo('waiting')
      table.json('colors_config').notNullable()
      table.integer('cantidad_colores').notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
