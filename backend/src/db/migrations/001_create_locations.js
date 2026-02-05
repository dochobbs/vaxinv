exports.up = function (knex) {
  return knex.schema.createTable('locations', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.string('address');
    t.boolean('is_active').defaultTo(true);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('locations');
};
