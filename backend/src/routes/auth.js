const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

// PIN login (MAs)
router.post('/login-pin', async (req, res) => {
  const { pin } = req.body;
  if (!pin || pin.length < 6) {
    return res.status(400).json({ error: 'PIN must be at least 6 digits' });
  }

  try {
    const users = await req.db('users').where({ is_active: true });
    for (const user of users) {
      if (user.pin_hash && await bcrypt.compare(pin, user.pin_hash)) {
        req.session.userId = user.id;
        req.session.role = user.role;
        req.session.locationId = user.location_id;
        const { pin_hash, password_hash, ...safeUser } = user;
        return res.json({ user: safeUser });
      }
    }
    return res.status(401).json({ error: 'Invalid PIN' });
  } catch (err) {
    return res.status(500).json({ error: 'Login failed' });
  }
});

// Username/password login (admin/manager)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const user = await req.db('users')
      .where({ username, is_active: true })
      .first();
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.locationId = user.location_id;
    const { pin_hash, password_hash, ...safeUser } = user;
    return res.json({ user: safeUser });
  } catch (err) {
    return res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// Current user
router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = await req.db('users').where({ id: req.session.userId }).first();
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  const { pin_hash, password_hash, ...safeUser } = user;
  res.json({ user: safeUser });
});

module.exports = router;
