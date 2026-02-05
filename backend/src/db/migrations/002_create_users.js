exports.up = function (knex) {
  return knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.string('username').unique();
    t.string('pin_hash');
    t.string('password_hash');
    t.string('role').notNullable().defaultTo('ma');
    t.integer('location_id').unsigned().references('id').inTable('locations');
    t.boolean('is_active').defaultTo(true);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('users');
};
