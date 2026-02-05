exports.up = function (knex) {
  return knex.schema.createTable('vaccines', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.string('short_name').notNullable();
    t.string('cpt_code');
    t.string('cvx_code');
    t.string('ndc_pattern');
    t.string('manufacturer');
    t.integer('doses_per_vial').defaultTo(1);
    t.integer('min_age_months');
    t.integer('max_age_months');
    t.integer('beyond_use_days');
    t.boolean('is_active').defaultTo(true);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('vaccines');
};
