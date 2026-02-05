const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const router = express.Router();

// List active vaccines
router.get('/', requireAuth, async (req, res) => {
  const vaccines = await req.db('vaccines').where({ is_active: true }).orderBy('short_name');
  res.json(vaccines);
});

// Match NDC to vaccine
router.get('/match-ndc/:ndc', requireAuth, async (req, res) => {
  const { ndc } = req.params;
  const vaccines = await req.db('vaccines').where({ is_active: true });
  const matches = vaccines.filter(v => {
    if (!v.ndc_pattern) return false;
    try {
      return new RegExp(v.ndc_pattern).test(ndc);
    } catch {
      return false;
    }
  });
  if (matches.length === 0) {
    return res.status(404).json({ error: 'No matching vaccine found', ndc });
  }
  res.json(matches);
});

// Create vaccine (admin only)
router.post('/', requireRole('admin'), async (req, res) => {
  const { name, short_name, cpt_code, cvx_code, ndc_pattern, manufacturer,
    doses_per_vial, min_age_months, max_age_months, beyond_use_days } = req.body;

  if (!name || !short_name) {
    return res.status(400).json({ error: 'Name and short_name required' });
  }

  const [id] = await req.db('vaccines').insert({
    name, short_name, cpt_code, cvx_code, ndc_pattern, manufacturer,
    doses_per_vial: doses_per_vial || 1, min_age_months, max_age_months,
    beyond_use_days, is_active: true,
  });

  const vaccine = await req.db('vaccines').where({ id }).first();
  await auditLog(req.db, {
    userId: req.session.userId, locationId: req.session.locationId,
    action: 'create', entityType: 'vaccine', entityId: id,
    details: { name, short_name },
  });
  res.status(201).json(vaccine);
});

// Update vaccine (admin only)
router.put('/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const allowed = ['name', 'short_name', 'cpt_code', 'cvx_code', 'ndc_pattern',
    'manufacturer', 'doses_per_vial', 'min_age_months', 'max_age_months',
    'beyond_use_days', 'is_active'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  await req.db('vaccines').where({ id }).update(updates);
  const vaccine = await req.db('vaccines').where({ id }).first();
  await auditLog(req.db, {
    userId: req.session.userId, locationId: req.session.locationId,
    action: 'update', entityType: 'vaccine', entityId: parseInt(id),
    details: updates,
  });
  res.json(vaccine);
});

module.exports = router;
