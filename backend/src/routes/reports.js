const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

function toCsv(rows, columns) {
  if (!rows.length) return '';
  const keys = columns || Object.keys(rows[0]);
  const header = keys.join(',');
  const lines = rows.map(r => keys.map(k => {
    const v = r[k];
    if (v === null || v === undefined) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(','));
  return [header, ...lines].join('\n');
}

function sendResult(res, req, data, filename) {
  if (req.query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send(toCsv(data));
  }
  res.json(data);
}

router.get('/inventory', requireAuth, async (req, res) => {
  const locationId = req.query.location_id || req.session.locationId;
  const data = await req.db('inventory')
    .join('vaccines', 'inventory.vaccine_id', 'vaccines.id')
    .where('inventory.location_id', locationId)
    .where('inventory.quantity_remaining', '>', 0)
    .select('vaccines.short_name', 'inventory.lot_number', 'inventory.funding_source',
      'inventory.quantity_remaining', 'inventory.expiration_date', 'vaccines.manufacturer')
    .orderBy('vaccines.short_name');
  sendResult(res, req, data, 'inventory_report');
});

router.get('/administrations', requireAuth, async (req, res) => {
  const query = req.db('administrations')
    .join('inventory', 'administrations.inventory_id', 'inventory.id')
    .join('vaccines', 'inventory.vaccine_id', 'vaccines.id')
    .join('users', 'administrations.administered_by_user_id', 'users.id')
    .select('administrations.administered_at', 'vaccines.short_name', 'inventory.lot_number',
      'administrations.funding_source', 'administrations.quantity', 'users.name as administered_by')
    .orderBy('administrations.administered_at', 'desc');

  if (req.query.location_id) query.where('administrations.location_id', req.query.location_id);
  if (req.query.start_date) query.where('administrations.administered_at', '>=', req.query.start_date);
  if (req.query.end_date) query.where('administrations.administered_at', '<=', req.query.end_date);
  if (req.query.vaccine_id) query.where('inventory.vaccine_id', req.query.vaccine_id);

  sendResult(res, req, await query, 'administrations_report');
});

router.get('/wastage', requireAuth, async (req, res) => {
  const query = req.db('adjustments')
    .join('inventory', 'adjustments.inventory_id', 'inventory.id')
    .join('vaccines', 'inventory.vaccine_id', 'vaccines.id')
    .join('users', 'adjustments.adjusted_by_user_id', 'users.id')
    .select('adjustments.adjusted_at', 'adjustments.adjustment_type', 'vaccines.short_name',
      'inventory.lot_number', 'adjustments.quantity', 'adjustments.reason', 'users.name as adjusted_by')
    .orderBy('adjustments.adjusted_at', 'desc');

  if (req.query.location_id) query.where('inventory.location_id', req.query.location_id);
  if (req.query.adjustment_type) query.where('adjustments.adjustment_type', req.query.adjustment_type);
  if (req.query.start_date) query.where('adjustments.adjusted_at', '>=', req.query.start_date);
  if (req.query.end_date) query.where('adjustments.adjusted_at', '<=', req.query.end_date);

  sendResult(res, req, await query, 'wastage_report');
});

router.get('/temperature', requireAuth, async (req, res) => {
  const query = req.db('temperature_logs')
    .join('users', 'temperature_logs.logged_by_user_id', 'users.id')
    .select('temperature_logs.reading_time', 'temperature_logs.unit_name',
      'temperature_logs.reading_f', 'temperature_logs.out_of_range',
      'temperature_logs.notes', 'users.name as logged_by')
    .orderBy('temperature_logs.reading_time', 'desc');

  if (req.query.location_id) query.where('temperature_logs.location_id', req.query.location_id);
  if (req.query.start_date) query.where('temperature_logs.reading_time', '>=', req.query.start_date);
  if (req.query.end_date) query.where('temperature_logs.reading_time', '<=', req.query.end_date);

  sendResult(res, req, await query, 'temperature_report');
});

router.get('/audit', requireRole('admin'), async (req, res) => {
  const query = req.db('audit_log')
    .leftJoin('users', 'audit_log.user_id', 'users.id')
    .select('audit_log.*', 'users.name as user_name')
    .orderBy('audit_log.created_at', 'desc');

  if (req.query.entity_type) query.where('audit_log.entity_type', req.query.entity_type);
  if (req.query.start_date) query.where('audit_log.created_at', '>=', req.query.start_date);
  if (req.query.end_date) query.where('audit_log.created_at', '<=', req.query.end_date);

  sendResult(res, req, await query, 'audit_report');
});

router.get('/expiring', requireAuth, async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const locationId = req.query.location_id || req.session.locationId;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  const data = await req.db('inventory')
    .join('vaccines', 'inventory.vaccine_id', 'vaccines.id')
    .where('inventory.location_id', locationId)
    .where('inventory.quantity_remaining', '>', 0)
    .where('inventory.expiration_date', '<=', cutoff.toISOString().split('T')[0])
    .where('inventory.expiration_date', '>', new Date().toISOString().split('T')[0])
    .select('vaccines.short_name', 'inventory.lot_number', 'inventory.funding_source',
      'inventory.quantity_remaining', 'inventory.expiration_date')
    .orderBy('inventory.expiration_date', 'asc');

  sendResult(res, req, data, 'expiring_report');
});

router.get('/low-stock', requireAuth, async (req, res) => {
  const threshold = parseInt(req.query.threshold) || 5;
  const locationId = req.query.location_id || req.session.locationId;

  const data = await req.db('inventory')
    .join('vaccines', 'inventory.vaccine_id', 'vaccines.id')
    .where('inventory.location_id', locationId)
    .where('inventory.quantity_remaining', '>', 0)
    .where('inventory.quantity_remaining', '<', threshold)
    .select('vaccines.short_name', 'inventory.lot_number', 'inventory.funding_source',
      'inventory.quantity_remaining', 'inventory.expiration_date')
    .orderBy('inventory.quantity_remaining', 'asc');

  sendResult(res, req, data, 'low_stock_report');
});

module.exports = router;
