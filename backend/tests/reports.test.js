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

  // Create some test data
  await agent.post('/api/inventory/receive').send({
    vaccine_id: 1, lot_number: 'RPT_LOT1', expiration_date: '2027-06-15',
    funding_source: 'vfc', quantity: 10,
  });
  await agent.post('/api/temperature').send({ unit_name: 'Fridge 1', reading_f: 41.0 });
});

afterAll(async () => { await db.destroy(); });

describe('GET /api/reports/inventory', () => {
  it('returns inventory report', async () => {
    const res = await agent.get('/api/reports/inventory');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns CSV when requested', async () => {
    const res = await agent.get('/api/reports/inventory?format=csv');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
  });
});

describe('GET /api/reports/administrations', () => {
  it('returns administrations report', async () => {
    const res = await agent.get('/api/reports/administrations');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/reports/wastage', () => {
  it('returns wastage report', async () => {
    const res = await agent.get('/api/reports/wastage');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/reports/temperature', () => {
  it('returns temperature report', async () => {
    const res = await agent.get('/api/reports/temperature');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/reports/audit', () => {
  it('returns audit report for admin', async () => {
    const res = await agent.get('/api/reports/audit');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/reports/expiring', () => {
  it('returns expiring lots', async () => {
    const res = await agent.get('/api/reports/expiring?days=365');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/reports/low-stock', () => {
  it('returns low-stock lots', async () => {
    const res = await agent.get('/api/reports/low-stock?threshold=100');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
