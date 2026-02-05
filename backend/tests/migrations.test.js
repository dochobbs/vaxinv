const knex = require('knex');
const config = require('../src/db/knexfile');

describe('Database migrations', () => {
  let db;

  beforeAll(async () => {
    db = knex(config.test);
    await db.migrate.latest();
  });

  afterAll(async () => {
    await db.destroy();
  });

  const tables = ['locations', 'users', 'vaccines', 'inventory', 'administrations', 'adjustments', 'temperature_logs', 'audit_log', 'sessions'];

  tables.forEach(table => {
    it(`creates ${table} table`, async () => {
      const exists = await db.schema.hasTable(table);
      expect(exists).toBe(true);
    });
  });

  it('can insert and query a location', async () => {
    await db('locations').insert({ name: 'Main Clinic', address: '123 Main St', is_active: true });
    const rows = await db('locations').where({ name: 'Main Clinic' });
    expect(rows).toHaveLength(1);
    expect(rows[0].address).toBe('123 Main St');
  });
});
