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

describe('GET /api/locations', () => {
  it('lists active locations', async () => {
    const res = await agent.get('/api/locations');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('name');
  });
});

describe('POST /api/locations', () => {
  it('creates a location', async () => {
    const res = await agent.post('/api/locations').send({
      name: 'New Clinic', address: '789 Elm St',
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('New Clinic');
  });

  it('rejects without name', async () => {
    const res = await agent.post('/api/locations').send({ address: 'test' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/locations/:id', () => {
  it('updates a location', async () => {
    const res = await agent.put('/api/locations/1').send({ address: 'Updated Address' });
    expect(res.status).toBe(200);
    expect(res.body.address).toBe('Updated Address');
  });
});
