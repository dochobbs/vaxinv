const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const locations = await req.db('locations').where({ is_active: true }).orderBy('name');
  res.json(locations);
});

router.post('/', requireRole('admin'), async (req, res) => {
  const { name, address } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const [id] = await req.db('locations').insert({ name, address, is_active: true });
  const location = await req.db('locations').where({ id }).first();

  await auditLog(req.db, {
    userId: req.session.userId, locationId: req.session.locationId,
    action: 'create', entityType: 'location', entityId: id, details: { name },
  });
  res.status(201).json(location);
});

router.put('/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const allowed = ['name', 'address', 'is_active'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  await req.db('locations').where({ id }).update(updates);
  const location = await req.db('locations').where({ id }).first();

  await auditLog(req.db, {
    userId: req.session.userId, locationId: req.session.locationId,
    action: 'update', entityType: 'location', entityId: parseInt(id), details: updates,
  });
  res.json(location);
});

module.exports = router;
