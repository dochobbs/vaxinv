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

describe('GET /api/users', () => {
  it('lists users without hashes', async () => {
    const res = await agent.get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).not.toHaveProperty('pin_hash');
    expect(res.body[0]).not.toHaveProperty('password_hash');
  });
});

describe('POST /api/users', () => {
  it('creates a user', async () => {
    const res = await agent.post('/api/users').send({
      name: 'Test MA', pin: '654321', role: 'ma', location_id: 1,
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test MA');
    expect(res.body.role).toBe('ma');
    expect(res.body).not.toHaveProperty('pin_hash');
  });

  it('rejects missing fields', async () => {
    const res = await agent.post('/api/users').send({ name: 'Test' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/users/:id', () => {
  it('updates a user', async () => {
    const users = await agent.get('/api/users');
    const testUser = users.body.find(u => u.name === 'Test MA');
    const res = await agent.put(`/api/users/${testUser.id}`).send({ name: 'Updated MA' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated MA');
  });
});

describe('PUT /api/users/:id/reset-pin', () => {
  it('resets a PIN', async () => {
    const users = await agent.get('/api/users');
    const testUser = users.body.find(u => u.name === 'Updated MA');
    const res = await agent.put(`/api/users/${testUser.id}/reset-pin`).send({ pin: '111111' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('rejects short PIN', async () => {
    const res = await agent.put('/api/users/1/reset-pin').send({ pin: '123' });
    expect(res.status).toBe(400);
  });
});
