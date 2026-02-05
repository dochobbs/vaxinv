exports.up = function (knex) {
  return knex.schema.createTable('sessions', (t) => {
    t.string('sid').primary();
    t.json('sess').notNullable();
    t.timestamp('expired');
  });
};
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('sessions');
};
