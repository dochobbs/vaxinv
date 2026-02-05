process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db/connection');

let agent;
let inventoryId;

beforeAll(async () => {
  await db.migrate.latest();
  await db.seed.run();
  agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username: 'admin', password: 'admin123' });

  const res = await agent.post('/api/inventory/receive').send({
    vaccine_id: 1, lot_number: 'ADJ_LOT1', expiration_date: '2027-06-15',
    ndc: '49281001001', funding_source: 'vfc', quantity: 20,
  });
  inventoryId = res.body.id;
});

afterAll(async () => { await db.destroy(); });

describe('POST /api/adjustments (waste)', () => {
  it('records waste and decrements quantity', async () => {
    const res = await agent.post('/api/adjustments').send({
      inventory_id: inventoryId, adjustment_type: 'waste', quantity: 2, reason: 'Dropped',
    });
    expect(res.status).toBe(201);
    expect(res.body.inventory.quantity_remaining).toBe(18);
  });

  it('rejects exceeding remaining', async () => {
    const res = await agent.post('/api/adjustments').send({
      inventory_id: inventoryId, adjustment_type: 'waste', quantity: 999, reason: 'test',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('exceeds');
  });
});

describe('POST /api/adjustments (transfer)', () => {
  it('transfers stock to another location', async () => {
    await db('locations').insert({ name: 'Branch Office', address: '456 Oak', is_active: true });
    const branch = await db('locations').where({ name: 'Branch Office' }).first();

    const res = await agent.post('/api/adjustments').send({
      inventory_id: inventoryId, adjustment_type: 'transfer_out',
      quantity: 3, related_location_id: branch.id,
    });
    expect(res.status).toBe(201);
    expect(res.body.inventory.quantity_remaining).toBe(15);

    const destInv = await db('inventory').where({ location_id: branch.id, lot_number: 'ADJ_LOT1' }).first();
    expect(destInv).toBeDefined();
    expect(destInv.quantity_remaining).toBe(3);
  });
});

describe('POST /api/adjustments (correction)', () => {
  it('corrects quantity', async () => {
    const res = await agent.post('/api/adjustments').send({
      inventory_id: inventoryId, adjustment_type: 'correction',
      quantity: 14, reason: 'Physical count',
    });
    expect(res.status).toBe(201);
    expect(res.body.inventory.quantity_remaining).toBe(14);
  });
});

describe('POST /api/adjustments/recall', () => {
  it('quarantines lots by lot number', async () => {
    const recv = await agent.post('/api/inventory/receive').send({
      vaccine_id: 1, lot_number: 'RECALL_LOT', expiration_date: '2027-06-15',
      funding_source: 'vfc', quantity: 10,
    });
    const res = await agent.post('/api/adjustments/recall').send({
      lot_number: 'RECALL_LOT', reason: 'Manufacturer recall',
    });
    expect(res.status).toBe(200);
    expect(res.body.quarantined_count).toBeGreaterThanOrEqual(1);

    const lot = await db('inventory').where({ id: recv.body.id }).first();
    expect(lot.is_quarantined).toBeTruthy();
  });
});

describe('POST /api/adjustments/bulk-expire', () => {
  it('zeros out expired lots', async () => {
    await agent.post('/api/inventory/receive').send({
      vaccine_id: 1, lot_number: 'OLD_LOT', expiration_date: '2020-01-01',
      funding_source: 'vfc', quantity: 5,
    });
    const res = await agent.post('/api/adjustments/bulk-expire');
    expect(res.status).toBe(200);
    expect(res.body.expired_count).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/adjustments', () => {
  it('lists adjustments', async () => {
    const res = await agent.get('/api/adjustments');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});
