const express = require('express');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const locationId = req.query.location_id || req.session.locationId;
  const today = new Date().toISOString().split('T')[0];

  const inventory_summary = await req.db('inventory')
    .join('vaccines', 'inventory.vaccine_id', 'vaccines.id')
    .where('inventory.location_id', locationId)
    .where('inventory.quantity_remaining', '>', 0)
    .groupBy('vaccines.short_name', 'inventory.funding_source')
    .select('vaccines.short_name', 'inventory.funding_source')
    .sum('inventory.quantity_remaining as total_doses')
    .orderBy('vaccines.short_name');

  const expireCutoff90 = new Date();
  expireCutoff90.setDate(expireCutoff90.getDate() + 90);
  const expiring_soon = await req.db('inventory')
    .join('vaccines', 'inventory.vaccine_id', 'vaccines.id')
    .where('inventory.location_id', locationId)
    .where('inventory.quantity_remaining', '>', 0)
    .where('inventory.expiration_date', '>', today)
    .where('inventory.expiration_date', '<=', expireCutoff90.toISOString().split('T')[0])
    .select('inventory.*', 'vaccines.short_name')
    .orderBy('inventory.expiration_date', 'asc');

  const low_stock = await req.db('inventory')
    .join('vaccines', 'inventory.vaccine_id', 'vaccines.id')
    .where('inventory.location_id', locationId)
    .where('inventory.quantity_remaining', '>', 0)
    .where('inventory.quantity_remaining', '<', 5)
    .select('inventory.*', 'vaccines.short_name')
    .orderBy('inventory.quantity_remaining', 'asc');

  const recent_activity = await req.db('audit_log')
    .leftJoin('users', 'audit_log.user_id', 'users.id')
    .where('audit_log.location_id', locationId)
    .select('audit_log.*', 'users.name as user_name')
    .orderBy('audit_log.created_at', 'desc')
    .limit(20);

  const vial_alerts = await req.db('inventory')
    .join('vaccines', 'inventory.vaccine_id', 'vaccines.id')
    .where('inventory.location_id', locationId)
    .whereNotNull('inventory.opened_at')
    .whereNotNull('inventory.discard_after')
    .where('inventory.quantity_remaining', '>', 0)
    .select('inventory.*', 'vaccines.short_name')
    .orderBy('inventory.discard_after', 'asc');

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const temperature_excursions = await req.db('temperature_logs')
    .where({ location_id: locationId, out_of_range: true })
    .where('reading_time', '>=', oneDayAgo)
    .orderBy('reading_time', 'desc');

  res.json({
    inventory_summary, expiring_soon, low_stock,
    recent_activity, vial_alerts, temperature_excursions,
  });
});

module.exports = router;
