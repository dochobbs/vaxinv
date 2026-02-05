const request = require('supertest');

process.env.NODE_ENV = 'test';
const app = require('../src/app');
const db = require('../src/db/connection');

let agent;

beforeAll(async () => {
  await db.migrate.latest();
  await db.seed.run();
  agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
});

afterAll(async () => {
  await db.destroy();
});

describe('POST /api/inventory/receive', () => {
  it('receives new inventory', async () => {
    const res = await agent.post('/api/inventory/receive').send({
      vaccine_id: 1,
      lot_number: 'LOT123',
      expiration_date: '2027-06-15',
      ndc: '49281001001',
      funding_source: 'vfc',
      quantity: 10,
    });
    expect(res.status).toBe(201);
    expect(res.body.quantity_remaining).toBe(10);
    expect(res.body.lot_number).toBe('LOT123');
    expect(res.body.funding_source).toBe('vfc');
  });

  it('rejects without required fields', async () => {
    const res = await agent.post('/api/inventory/receive').send({ vaccine_id: 1 });
    expect(res.status).toBe(400);
  });

  it('rejects invalid funding source', async () => {
    const res = await agent.post('/api/inventory/receive').send({
      vaccine_id: 1, lot_number: 'LOT', expiration_date: '2027-01-01',
      funding_source: 'invalid', quantity: 5,
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/inventory', () => {
  it('returns inventory for current location', async () => {
    const res = await agent.get('/api/inventory');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('vaccine_name');
  });

  it('filters by funding source', async () => {
    // Add private inventory
    await agent.post('/api/inventory/receive').send({
      vaccine_id: 1, lot_number: 'LOT_PRIV', expiration_date: '2027-06-15',
      ndc: '49281001001', funding_source: 'private', quantity: 5,
    });
    const res = await agent.get('/api/inventory?funding_source=vfc');
    expect(res.status).toBe(200);
    res.body.forEach(item => {
      expect(item.funding_source).toBe('vfc');
    });
  });
});

describe('GET /api/inventory/fefo/:vaccineId', () => {
  it('returns lots ordered by expiration (FEFO)', async () => {
    // Add a lot with earlier expiration
    await agent.post('/api/inventory/receive').send({
      vaccine_id: 1, lot_number: 'LOT_EARLIER', expiration_date: '2026-12-01',
      ndc: '49281001001', funding_source: 'vfc', quantity: 5,
    });
    const res = await agent.get('/api/inventory/fefo/1');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    // First lot should expire sooner or same
    for (let i = 1; i < res.body.length; i++) {
      expect(new Date(res.body[i-1].expiration_date) <= new Date(res.body[i].expiration_date)).toBe(true);
    }
  });
});

describe('GET /api/inventory/:id', () => {
  it('returns a single inventory record', async () => {
    const res = await agent.get('/api/inventory/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('lot_number');
    expect(res.body).toHaveProperty('vaccine_name');
  });

  it('returns 404 for non-existent', async () => {
    const res = await agent.get('/api/inventory/9999');
    expect(res.status).toBe(404);
  });
});
