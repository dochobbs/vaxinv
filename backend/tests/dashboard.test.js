process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db/connection');

let agent;

beforeAll(async () => {
  await db.migrate.latest();
  await db.seed.run();
  agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username: 'admin', password: 'admin123' });

  await agent.post('/api/inventory/receive').send({
    vaccine_id: 1, lot_number: 'DASH_LOT', expiration_date: '2027-06-15',
    funding_source: 'vfc', quantity: 10,
  });
});

afterAll(async () => { await db.destroy(); });

describe('GET /api/dashboard', () => {
  it('returns dashboard data with expected shape', async () => {
    const res = await agent.get('/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('inventory_summary');
    expect(res.body).toHaveProperty('expiring_soon');
    expect(res.body).toHaveProperty('low_stock');
    expect(res.body).toHaveProperty('recent_activity');
    expect(res.body).toHaveProperty('vial_alerts');
    expect(res.body).toHaveProperty('temperature_excursions');
    expect(Array.isArray(res.body.inventory_summary)).toBe(true);
  });
});
