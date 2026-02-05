exports.up = function (knex) {
  return knex.schema.createTable('temperature_logs', (t) => {
    t.increments('id').primary();
    t.integer('location_id').unsigned().notNullable().references('id').inTable('locations');
    t.string('unit_name').notNullable();
    t.decimal('reading_f', 5, 1).notNullable();
    t.timestamp('reading_time').defaultTo(knex.fn.now());
    t.integer('logged_by_user_id').unsigned().notNullable().references('id').inTable('users');
    t.boolean('out_of_range').defaultTo(false);
    t.text('notes');
  });
};
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('temperature_logs');
};
