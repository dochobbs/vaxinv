const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const router = express.Router();

// Administer a dose
router.post('/', requireAuth, async (req, res) => {
  const { inventory_id, funding_source, notes } = req.body;

  if (!inventory_id || !funding_source) {
    return res.status(400).json({ error: 'inventory_id and funding_source are required' });
  }
  if (!['vfc', 'private'].includes(funding_source)) {
    return res.status(400).json({ error: 'funding_source must be vfc or private' });
  }

  // Get inventory record with vaccine info
  const inventory = await req.db('inventory')
    .join('vaccines', 'inventory.vaccine_id', 'vaccines.id')
    .where('inventory.id', inventory_id)
    .select('inventory.*', 'vaccines.doses_per_vial', 'vaccines.beyond_use_days', 'vaccines.short_name')
    .first();

  if (!inventory) {
    return res.status(404).json({ error: 'Inventory record not found' });
  }

  // Safety checks
  if (inventory.is_quarantined) {
    return res.status(400).json({ error: 'Cannot administer from quarantined lot' });
  }

  const today = new Date().toISOString().split('T')[0];
  if (inventory.expiration_date <= today) {
    return res.status(400).json({ error: 'Cannot administer expired lot' });
  }

  if (inventory.quantity_remaining <= 0) {
    return res.status(400).json({ error: 'No doses remaining in this lot' });
  }

  // Check if beyond discard_after for opened multi-dose vials
  if (inventory.discard_after) {
    const now = new Date();
    const discardDate = new Date(inventory.discard_after);
    if (now > discardDate) {
      return res.status(400).json({ error: 'This vial has passed its beyond-use date and must be discarded' });
    }
  }

  // FEFO check: warn if not using the oldest lot
  const oldestLot = await req.db('inventory')
    .where({
      vaccine_id: inventory.vaccine_id,
      location_id: inventory.location_id,
      funding_source: funding_source,
      is_quarantined: false,
    })
    .where('quantity_remaining', '>', 0)
    .where('expiration_date', '>', today)
    .orderBy('expiration_date', 'asc')
    .first();

  const fefoWarning = oldestLot && oldestLot.id !== inventory.id
    ? `FEFO warning: Lot ${oldestLot.lot_number} (exp ${oldestLot.expiration_date}) expires sooner`
    : null;

  // Decrement quantity
  await req.db('inventory')
    .where({ id: inventory_id })
    .decrement('quantity_remaining', 1);

  // Multi-dose vial tracking: set opened_at and discard_after on first use
  if (inventory.doses_per_vial > 1 && !inventory.opened_at) {
    const now = new Date();
    const updates = { opened_at: now.toISOString() };

    if (inventory.beyond_use_days !== null && inventory.beyond_use_days !== undefined) {
      if (inventory.beyond_use_days === 0) {
        // Must use same day
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        updates.discard_after = endOfDay.toISOString();
      } else {
        const discardDate = new Date(now);
        discardDate.setDate(discardDate.getDate() + inventory.beyond_use_days);
        updates.discard_after = discardDate.toISOString();
      }
    }

    await req.db('inventory').where({ id: inventory_id }).update(updates);
  }

  // Record administration
  const [adminId] = await req.db('administrations').insert({
    inventory_id,
    location_id: req.session.locationId,
    administered_by_user_id: req.session.userId,
    quantity: 1,
    funding_source,
    notes,
  });

  await auditLog(req.db, {
    userId: req.session.userId,
    locationId: req.session.locationId,
    action: 'administer',
    entityType: 'administration',
    entityId: adminId,
    details: { inventory_id, lot_number: inventory.lot_number, vaccine: inventory.short_name, funding_source },
  });

  // Get updated inventory
  const updatedInventory = await req.db('inventory').where({ id: inventory_id }).first();

  res.status(201).json({
    administration: { id: adminId, inventory_id, funding_source, notes },
    inventory: updatedInventory,
    fefo_warning: fefoWarning,
  });
});

// List administrations for location
router.get('/', requireAuth, async (req, res) => {
  const locationId = req.query.location_id || req.session.locationId;
  const query = req.db('administrations')
    .join('inventory', 'administrations.inventory_id', 'inventory.id')
    .join('vaccines', 'inventory.vaccine_id', 'vaccines.id')
    .join('users', 'administrations.administered_by_user_id', 'users.id')
    .where('administrations.location_id', locationId)
    .select(
      'administrations.*',
      'inventory.lot_number',
      'inventory.expiration_date',
      'vaccines.name as vaccine_name',
      'vaccines.short_name',
      'users.name as administered_by_name'
    )
    .orderBy('administrations.administered_at', 'desc');

  if (req.query.start_date) {
    query.where('administrations.administered_at', '>=', req.query.start_date);
  }
  if (req.query.end_date) {
    query.where('administrations.administered_at', '<=', req.query.end_date);
  }
  if (req.query.vaccine_id) {
    query.where('inventory.vaccine_id', req.query.vaccine_id);
  }

  const administrations = await query;
  res.json(administrations);
});

module.exports = router;
