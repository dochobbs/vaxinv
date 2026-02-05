exports.up = function (knex) {
  return knex.schema.createTable('administrations', (t) => {
    t.increments('id').primary();
    t.integer('inventory_id').unsigned().notNullable().references('id').inTable('inventory');
    t.integer('location_id').unsigned().notNullable().references('id').inTable('locations');
    t.integer('administered_by_user_id').unsigned().notNullable().references('id').inTable('users');
    t.integer('quantity').notNullable().defaultTo(1);
    t.string('funding_source').notNullable();
    t.text('notes');
    t.timestamp('administered_at').defaultTo(knex.fn.now());
  });
};
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('administrations');
};
