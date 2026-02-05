const request = require('supertest');

// Set env before importing app
process.env.NODE_ENV = 'test';
const app = require('../src/app');
const db = require('../src/db/connection');

beforeAll(async () => {
  await db.migrate.latest();
  await db.seed.run();
});

afterAll(async () => {
  await db.destroy();
});

describe('POST /api/auth/login-pin', () => {
  it('returns 401 for invalid PIN', async () => {
    const res = await request(app)
      .post('/api/auth/login-pin')
      .send({ pin: '999999' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for short PIN', async () => {
    const res = await request(app)
      .post('/api/auth/login-pin')
      .send({ pin: '123' });
    expect(res.status).toBe(400);
  });

  it('returns 200 and user info for valid PIN', async () => {
    const res = await request(app)
      .post('/api/auth/login-pin')
      .send({ pin: '123456' });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('System Admin');
    expect(res.body.user.pin_hash).toBeUndefined();
    expect(res.body.user.password_hash).toBeUndefined();
  });
});

describe('POST /api/auth/login', () => {
  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin' });
    expect(res.status).toBe(400);
  });

  it('returns 200 for correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('admin');
  });
});

describe('POST /api/auth/logout', () => {
  it('returns 200', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 when not logged in', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns user when logged in via session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('System Admin');
  });
});
