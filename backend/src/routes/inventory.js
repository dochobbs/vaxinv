const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const router = express.Router();

// Receive inventory
router.post('/receive', requireAuth, async (req, res) => {
  const { vaccine_id, lot_number, expiration_date, ndc, funding_source, quantity, notes } = req.body;

  if (!vaccine_id || !lot_number || !expiration_date || !funding_source || !quantity) {
    return res.status(400).json({ error: 'vaccine_id, lot_number, expiration_date, funding_source, and quantity are required' });
  }
  if (!['vfc', 'private'].includes(funding_source)) {
    return res.status(400).json({ error: 'funding_source must be vfc or private' });
  }
  if (quantity <= 0) {
    return res.status(400).json({ error: 'quantity must be positive' });
  }

  const locationId = req.session.locationId;

  const [id] = await req.db('inventory').insert({
    vaccine_id, location_id: locationId, lot_number, expiration_date, ndc,
    funding_source, quantity_received: quantity, quantity_remaining: quantity,
    received_by_user_id: req.session.userId, notes,
  });

  const record = await req.db('inventory').where({ id }).first();
  await auditLog(req.db, {
    userId: req.session.userId, locationId, action: 'receive',
    entityType: 'inventory', entityId: id,
    details: { vaccine_id, lot_number, quantity, funding_source },
  });
  res.status(201).json(record);
});

// List inventory for location (only records with quantity > 0)
router.get('/', requireAuth, async (req, res) => {
  const locationId = req.query.location_id || req.session.locationId;
  const query = req.db('inventory')
    .join('vaccines', 'inventory.vaccine_id', 'vaccines.id')
    .where('inventory.location_id', locationId)
    .where('inventory.quantity_remaining', '>', 0)
    .select(
      'inventory.*',
      'vaccines.name as vaccine_name',
      'vaccines.short_name',
      'vaccines.cvx_code',
      'vaccines.doses_per_vial',
      'vaccines.beyond_use_days'
    )
    .orderBy('inventory.expiration_date', 'asc');

  if (req.query.funding_source) {
    query.where('inventory.funding_source', req.query.funding_source);
  }
  if (req.query.vaccine_id) {
    query.where('inventory.vaccine_id', req.query.vaccine_id);
  }

  const inventory = await query;
  res.json(inventory);
});

// FEFO (first expired, first out) for a specific vaccine at current location
router.get('/fefo/:vaccineId', requireAuth, async (req, res) => {
  const locationId = req.query.location_id || req.session.locationId;
  const today = new Date().toISOString().split('T')[0];

  const inventory = await req.db('inventory')
    .join('vaccines', 'inventory.vaccine_id', 'vaccines.id')
    .where({
      'inventory.vaccine_id': req.params.vaccineId,
      'inventory.location_id': locationId,
      'inventory.is_quarantined': false,
    })
    .where('inventory.quantity_remaining', '>', 0)
    .where('inventory.expiration_date', '>', today)
    .select('inventory.*', 'vaccines.short_name', 'vaccines.beyond_use_days')
    .orderBy('inventory.expiration_date', 'asc');

  res.json(inventory);
});

// Get single inventory record
router.get('/:id', requireAuth, async (req, res) => {
  const record = await req.db('inventory')
    .join('vaccines', 'inventory.vaccine_id', 'vaccines.id')
    .where('inventory.id', req.params.id)
    .select('inventory.*', 'vaccines.name as vaccine_name', 'vaccines.short_name')
    .first();

  if (!record) return res.status(404).json({ error: 'Not found' });
  res.json(record);
});

module.exports = router;
