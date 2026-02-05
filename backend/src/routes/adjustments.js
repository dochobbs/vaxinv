const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const router = express.Router();

const VALID_TYPES = ['waste', 'transfer_out', 'transfer_in', 'correction', 'expired', 'recall', 'borrowing', 'returned'];

router.post('/', requireAuth, async (req, res) => {
  const { inventory_id, adjustment_type, quantity, reason, related_location_id } = req.body;

  if (!inventory_id || !adjustment_type || quantity === undefined) {
    return res.status(400).json({ error: 'inventory_id, adjustment_type, and quantity are required' });
  }
  if (!VALID_TYPES.includes(adjustment_type)) {
    return res.status(400).json({ error: `Invalid adjustment_type` });
  }

  const inventory = await req.db('inventory').where({ id: inventory_id }).first();
  if (!inventory) {
    return res.status(404).json({ error: 'Inventory record not found' });
  }

  if (['waste', 'transfer_out', 'returned', 'borrowing'].includes(adjustment_type)) {
    if (quantity <= 0) return res.status(400).json({ error: 'quantity must be positive' });
    if (quantity > inventory.quantity_remaining) return res.status(400).json({ error: 'quantity exceeds remaining stock' });
    if (!reason && adjustment_type !== 'transfer_out') return res.status(400).json({ error: 'reason is required' });
  }
  if (adjustment_type === 'transfer_out' && !related_location_id) {
    return res.status(400).json({ error: 'related_location_id is required for transfers' });
  }
  if (adjustment_type === 'correction' && !reason) {
    return res.status(400).json({ error: 'reason is required for corrections' });
  }

  const [id] = await req.db('adjustments').insert({
    inventory_id, adjustment_type, quantity, reason,
    adjusted_by_user_id: req.session.userId,
    related_location_id: related_location_id || null,
  });

  if (['waste', 'transfer_out', 'returned', 'borrowing'].includes(adjustment_type)) {
    await req.db('inventory').where({ id: inventory_id }).decrement('quantity_remaining', quantity);
  } else if (adjustment_type === 'correction') {
    await req.db('inventory').where({ id: inventory_id }).update({ quantity_remaining: quantity });
  } else if (adjustment_type === 'transfer_in') {
    await req.db('inventory').where({ id: inventory_id }).increment('quantity_remaining', quantity);
  }

  if (adjustment_type === 'transfer_out') {
    const [newInvId] = await req.db('inventory').insert({
      vaccine_id: inventory.vaccine_id,
      location_id: related_location_id,
      lot_number: inventory.lot_number,
      expiration_date: inventory.expiration_date,
      ndc: inventory.ndc,
      funding_source: inventory.funding_source,
      quantity_received: quantity,
      quantity_remaining: quantity,
      received_by_user_id: req.session.userId,
      notes: `Transfer from location ${inventory.location_id}`,
    });
    await req.db('adjustments').insert({
      inventory_id: newInvId, adjustment_type: 'transfer_in', quantity,
      reason: `Transfer from location ${inventory.location_id}`,
      adjusted_by_user_id: req.session.userId,
      related_location_id: inventory.location_id,
    });
  }

  await auditLog(req.db, {
    userId: req.session.userId, locationId: req.session.locationId,
    action: 'adjust', entityType: 'adjustment', entityId: id,
    details: { inventory_id, adjustment_type, quantity, reason },
  });

  const updated = await req.db('inventory').where({ id: inventory_id }).first();
  res.status(201).json({ adjustment: { id, adjustment_type, quantity, reason }, inventory: updated });
});

router.post('/bulk-expire', requireAuth, async (req, res) => {
  const locationId = req.session.locationId;
  const today = new Date().toISOString().split('T')[0];

  const expiredLots = await req.db('inventory')
    .where({ location_id: locationId })
    .where('expiration_date', '<=', today)
    .where('quantity_remaining', '>', 0);

  const results = [];
  for (const lot of expiredLots) {
    await req.db('adjustments').insert({
      inventory_id: lot.id, adjustment_type: 'expired',
      quantity: lot.quantity_remaining, reason: 'Bulk expire',
      adjusted_by_user_id: req.session.userId,
    });
    await req.db('inventory').where({ id: lot.id }).update({ quantity_remaining: 0 });
    results.push({ lot_number: lot.lot_number, quantity_expired: lot.quantity_remaining });
  }

  res.json({ expired_count: results.length, lots: results });
});

router.post('/recall', requireRole('admin', 'manager'), async (req, res) => {
  const { lot_number, reason } = req.body;
  if (!lot_number) return res.status(400).json({ error: 'lot_number is required' });

  const affected = await req.db('inventory')
    .where({ lot_number, is_quarantined: false })
    .where('quantity_remaining', '>', 0);

  for (const lot of affected) {
    await req.db('inventory').where({ id: lot.id }).update({ is_quarantined: true });
    await req.db('adjustments').insert({
      inventory_id: lot.id, adjustment_type: 'recall', quantity: 0,
      reason: reason || `Recall: lot ${lot_number}`,
      adjusted_by_user_id: req.session.userId,
    });
  }

  res.json({ quarantined_count: affected.length, lot_number });
});

router.get('/', requireAuth, async (req, res) => {
  const query = req.db('adjustments')
    .join('inventory', 'adjustments.inventory_id', 'inventory.id')
    .join('vaccines', 'inventory.vaccine_id', 'vaccines.id')
    .join('users', 'adjustments.adjusted_by_user_id', 'users.id')
    .select('adjustments.*', 'inventory.lot_number', 'inventory.location_id',
      'vaccines.short_name as vaccine_name', 'users.name as adjusted_by_name')
    .orderBy('adjustments.adjusted_at', 'desc');

  if (req.query.location_id) query.where('inventory.location_id', req.query.location_id);
  if (req.query.adjustment_type) query.where('adjustments.adjustment_type', req.query.adjustment_type);

  res.json(await query);
});

module.exports = router;
