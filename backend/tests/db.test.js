const db = require('../src/db/connection');

describe('Database connection', () => {
  afterAll(async () => {
    await db.destroy();
  });

  it('connects and runs a raw query', async () => {
    const result = await db.raw('SELECT 1 + 1 AS result');
    // SQLite returns array, PG returns rows
    const val = Array.isArray(result) ? result[0].result : result.rows[0].result;
    expect(val).toBe(2);
  });
});
