const request = require('supertest');

process.env.NODE_ENV = 'test';
const app = require('../src/app');
const db = require('../src/db/connection');

let agent;
let inventoryId;

beforeAll(async () => {
  await db.migrate.latest();
  await db.seed.run();
  agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username: 'admin', password: 'admin123' });

  // Create inventory to administer from
  const res = await agent.post('/api/inventory/receive').send({
    vaccine_id: 1, lot_number: 'ADMIN_LOT1', expiration_date: '2027-06-15',
    ndc: '49281001001', funding_source: 'vfc', quantity: 10,
  });
  inventoryId = res.body.id;
});

afterAll(async () => {
  await db.destroy();
});

describe('POST /api/administrations', () => {
  it('administers a dose and decrements quantity', async () => {
    const res = await agent.post('/api/administrations').send({
      inventory_id: inventoryId, funding_source: 'vfc',
    });
    expect(res.status).toBe(201);
    expect(res.body.inventory.quantity_remaining).toBe(9);
    expect(res.body.administration.inventory_id).toBe(inventoryId);
  });

  it('rejects missing required fields', async () => {
    const res = await agent.post('/api/administrations').send({});
    expect(res.status).toBe(400);
  });

  it('rejects expired lots', async () => {
    // Create expired inventory
    const expired = await agent.post('/api/inventory/receive').send({
      vaccine_id: 1, lot_number: 'EXPIRED_LOT', expiration_date: '2020-01-01',
      funding_source: 'vfc', quantity: 5,
    });
    const res = await agent.post('/api/administrations').send({
      inventory_id: expired.body.id, funding_source: 'vfc',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('expired');
  });

  it('rejects quarantined lots', async () => {
    // Create quarantined inventory
    const quarantined = await agent.post('/api/inventory/receive').send({
      vaccine_id: 1, lot_number: 'QUAR_LOT', expiration_date: '2027-06-15',
      funding_source: 'vfc', quantity: 5,
    });
    await db('inventory').where({ id: quarantined.body.id }).update({ is_quarantined: true });

    const res = await agent.post('/api/administrations').send({
      inventory_id: quarantined.body.id, funding_source: 'vfc',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('quarantined');
  });

  it('tracks multi-dose vial opening', async () => {
    // Vaccine id 11 is Flu (Peds) with doses_per_vial=10, beyond_use_days=28
    const multiDose = await agent.post('/api/inventory/receive').send({
      vaccine_id: 11, lot_number: 'MULTI_LOT', expiration_date: '2027-06-15',
      funding_source: 'private', quantity: 10,
    });

    const res = await agent.post('/api/administrations').send({
      inventory_id: multiDose.body.id, funding_source: 'private',
    });
    expect(res.status).toBe(201);
    expect(res.body.inventory.opened_at).toBeDefined();
    expect(res.body.inventory.discard_after).toBeDefined();
    expect(res.body.inventory.quantity_remaining).toBe(9);
  });
});

describe('GET /api/administrations', () => {
  it('lists administrations for current location', async () => {
    const res = await agent.get('/api/administrations');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('vaccine_name');
    expect(res.body[0]).toHaveProperty('lot_number');
  });
});
