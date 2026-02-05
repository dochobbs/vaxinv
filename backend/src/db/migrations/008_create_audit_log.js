exports.up = function (knex) {
  return knex.schema.createTable('audit_log', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().references('id').inTable('users');
    t.integer('location_id').unsigned().references('id').inTable('locations');
    t.string('action').notNullable();
    t.string('entity_type').notNullable();
    t.integer('entity_id');
    t.json('details');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('audit_log');
};
