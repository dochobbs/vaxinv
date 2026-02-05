const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const router = express.Router();

router.post('/', requireAuth, async (req, res) => {
  const { unit_name, reading_f, reading_time, notes } = req.body;

  if (!unit_name || reading_f === undefined) {
    return res.status(400).json({ error: 'unit_name and reading_f are required' });
  }

  const out_of_range = reading_f < 36 || reading_f > 46;

  const [id] = await req.db('temperature_logs').insert({
    location_id: req.session.locationId,
    unit_name,
    reading_f,
    reading_time: reading_time || new Date().toISOString(),
    logged_by_user_id: req.session.userId,
    out_of_range,
    notes,
  });

  const record = await req.db('temperature_logs').where({ id }).first();
  res.status(201).json(record);
});

router.get('/', requireAuth, async (req, res) => {
  const locationId = req.query.location_id || req.session.locationId;
  const query = req.db('temperature_logs')
    .where({ location_id: locationId })
    .orderBy('reading_time', 'desc');

  if (req.query.start_date) query.where('reading_time', '>=', req.query.start_date);
  if (req.query.end_date) query.where('reading_time', '<=', req.query.end_date);

  res.json(await query);
});

router.get('/excursions', requireAuth, async (req, res) => {
  const locationId = req.query.location_id || req.session.locationId;
  const query = req.db('temperature_logs')
    .where({ location_id: locationId, out_of_range: true })
    .orderBy('reading_time', 'desc');

  if (req.query.start_date) query.where('reading_time', '>=', req.query.start_date);
  if (req.query.end_date) query.where('reading_time', '<=', req.query.end_date);

  res.json(await query);
});

module.exports = router;
