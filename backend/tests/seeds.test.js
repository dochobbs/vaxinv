const knex = require('knex');
const config = require('../src/db/knexfile');

describe('Seed data', () => {
  let db;

  beforeAll(async () => {
    db = knex(config.test);
    await db.migrate.latest();
    await db.seed.run();
  });

  afterAll(async () => {
    await db.destroy();
  });

  it('seeds standard pediatric vaccines', async () => {
    const vaccines = await db('vaccines').where({ is_active: true });
    expect(vaccines.length).toBeGreaterThanOrEqual(15);
  });

  it('seeds DTaP vaccine with correct CVX code', async () => {
    const dtap = await db('vaccines').where({ short_name: 'DTaP' }).first();
    expect(dtap).toBeDefined();
    expect(dtap.cvx_code).toBe('20');
    expect(dtap.manufacturer).toBeDefined();
  });

  it('seeds a bootstrap admin user', async () => {
    const admin = await db('users').where({ role: 'admin' }).first();
    expect(admin).toBeDefined();
    expect(admin.name).toBe('System Admin');
  });

  it('seeds a default location', async () => {
    const location = await db('locations').first();
    expect(location).toBeDefined();
    expect(location.name).toBe('Main Clinic');
  });
});
