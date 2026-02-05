const express = require('express');
const bcrypt = require('bcrypt');
const { requireRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const router = express.Router();

router.get('/', requireRole('admin'), async (req, res) => {
  const users = await req.db('users')
    .select('id', 'name', 'username', 'role', 'location_id', 'is_active', 'created_at')
    .orderBy('name');
  res.json(users);
});

router.post('/', requireRole('admin'), async (req, res) => {
  const { name, username, pin, password, role, location_id } = req.body;
  if (!name || !pin || !role) {
    return res.status(400).json({ error: 'name, pin, and role are required' });
  }
  if (!['ma', 'manager', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'role must be ma, manager, or admin' });
  }

  const pin_hash = await bcrypt.hash(pin, 10);
  const password_hash = password ? await bcrypt.hash(password, 10) : null;

  const [id] = await req.db('users').insert({
    name, username: username || null, pin_hash, password_hash,
    role, location_id: location_id || null, is_active: true,
  });

  const user = await req.db('users').where({ id })
    .select('id', 'name', 'username', 'role', 'location_id', 'is_active', 'created_at')
    .first();

  await auditLog(req.db, {
    userId: req.session.userId, locationId: req.session.locationId,
    action: 'create', entityType: 'user', entityId: id, details: { name, role },
  });
  res.status(201).json(user);
});

router.put('/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const allowed = ['name', 'username', 'role', 'location_id', 'is_active'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  await req.db('users').where({ id }).update(updates);
  const user = await req.db('users').where({ id })
    .select('id', 'name', 'username', 'role', 'location_id', 'is_active', 'created_at')
    .first();

  await auditLog(req.db, {
    userId: req.session.userId, locationId: req.session.locationId,
    action: 'update', entityType: 'user', entityId: parseInt(id), details: updates,
  });
  res.json(user);
});

router.put('/:id/reset-pin', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { pin } = req.body;
  if (!pin || pin.length < 6) {
    return res.status(400).json({ error: 'PIN must be at least 6 digits' });
  }

  const pin_hash = await bcrypt.hash(pin, 10);
  await req.db('users').where({ id }).update({ pin_hash });

  await auditLog(req.db, {
    userId: req.session.userId, locationId: req.session.locationId,
    action: 'reset_pin', entityType: 'user', entityId: parseInt(id), details: {},
  });
  res.json({ ok: true });
});

module.exports = router;
