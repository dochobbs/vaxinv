const request = require('supertest');

process.env.NODE_ENV = 'test';
const app = require('../src/app');
const db = require('../src/db/connection');

let agent;

beforeAll(async () => {
  await db.migrate.latest();
  await db.seed.run();
  agent = request.agent(app);
  // Login as admin
  await agent.post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
});

afterAll(async () => {
  await db.destroy();
});

describe('GET /api/vaccines', () => {
  it('returns list of active vaccines', async () => {
    const res = await agent.get('/api/vaccines');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(15);
    expect(res.body[0]).toHaveProperty('name');
    expect(res.body[0]).toHaveProperty('cvx_code');
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/vaccines');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/vaccines', () => {
  it('creates a new vaccine (admin only)', async () => {
    const res = await agent.post('/api/vaccines').send({
      name: 'Test Vaccine', short_name: 'TEST', cvx_code: '999',
      manufacturer: 'TestCo', doses_per_vial: 1,
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.short_name).toBe('TEST');
  });

  it('rejects without required fields', async () => {
    const res = await agent.post('/api/vaccines').send({ manufacturer: 'TestCo' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/vaccines/:id', () => {
  it('updates a vaccine', async () => {
    const res = await agent.put('/api/vaccines/1').send({ manufacturer: 'Updated Mfg' });
    expect(res.status).toBe(200);
    expect(res.body.manufacturer).toBe('Updated Mfg');
  });
});

describe('GET /api/vaccines/match-ndc/:ndc', () => {
  it('matches an NDC to a vaccine', async () => {
    const res = await agent.get('/api/vaccines/match-ndc/492810001');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('returns 404 for unknown NDC', async () => {
    const res = await agent.get('/api/vaccines/match-ndc/000000000');
    expect(res.status).toBe(404);
  });
});
