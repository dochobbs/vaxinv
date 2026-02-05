exports.up = function (knex) {
  return knex.schema.createTable('adjustments', (t) => {
    t.increments('id').primary();
    t.integer('inventory_id').unsigned().notNullable().references('id').inTable('inventory');
    t.string('adjustment_type').notNullable();
    t.integer('quantity').notNullable();
    t.text('reason');
    t.integer('adjusted_by_user_id').unsigned().notNullable().references('id').inTable('users');
    t.integer('related_location_id').unsigned().references('id').inTable('locations');
    t.timestamp('adjusted_at').defaultTo(knex.fn.now());
  });
};
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('adjustments');
};
