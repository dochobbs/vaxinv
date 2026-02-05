exports.up = function (knex) {
  return knex.schema.createTable('inventory', (t) => {
    t.increments('id').primary();
    t.integer('vaccine_id').unsigned().notNullable().references('id').inTable('vaccines');
    t.integer('location_id').unsigned().notNullable().references('id').inTable('locations');
    t.string('lot_number').notNullable();
    t.date('expiration_date').notNullable();
    t.string('ndc');
    t.string('funding_source').notNullable();
    t.integer('quantity_received').notNullable();
    t.integer('quantity_remaining').notNullable();
    t.integer('received_by_user_id').unsigned().references('id').inTable('users');
    t.boolean('is_quarantined').defaultTo(false);
    t.timestamp('opened_at');
    t.timestamp('discard_after');
    t.text('notes');
    t.timestamp('received_at').defaultTo(knex.fn.now());
  });
};
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('inventory');
};
