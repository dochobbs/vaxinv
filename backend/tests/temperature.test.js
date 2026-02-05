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
});

afterAll(async () => { await db.destroy(); });

describe('POST /api/temperature', () => {
  it('logs a normal temperature', async () => {
    const res = await agent.post('/api/temperature').send({
      unit_name: 'Fridge 1', reading_f: 40.5,
    });
    expect(res.status).toBe(201);
    expect(res.body.out_of_range).toBeFalsy();
  });

  it('auto-flags out-of-range reading', async () => {
    const res = await agent.post('/api/temperature').send({
      unit_name: 'Fridge 1', reading_f: 50.0,
    });
    expect(res.status).toBe(201);
    expect(res.body.out_of_range).toBeTruthy();
  });

  it('rejects missing fields', async () => {
    const res = await agent.post('/api/temperature').send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /api/temperature', () => {
  it('lists readings', async () => {
    const res = await agent.get('/api/temperature');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });
});

describe('GET /api/temperature/excursions', () => {
  it('returns only out-of-range readings', async () => {
    const res = await agent.get('/api/temperature/excursions');
    expect(res.status).toBe(200);
    res.body.forEach(r => expect(r.out_of_range).toBeTruthy());
  });
});
