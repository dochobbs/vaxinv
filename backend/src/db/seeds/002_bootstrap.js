const bcrypt = require('bcrypt');

exports.seed = async function (knex) {
  const existingAdmin = await knex('users').where({ role: 'admin' }).first();
  if (existingAdmin) return;

  let location = await knex('locations').where({ name: 'Main Clinic' }).first();
  if (!location) {
    const [id] = await knex('locations').insert({
      name: 'Main Clinic',
      address: '123 Main Street',
      is_active: true,
    });
    location = { id: typeof id === 'number' ? id : id.id };
  }

  const passwordHash = await bcrypt.hash('admin123', 10);
  const pinHash = await bcrypt.hash('123456', 10);

  await knex('users').insert({
    name: 'System Admin',
    username: 'admin',
    pin_hash: pinHash,
    password_hash: passwordHash,
    role: 'admin',
    location_id: location.id,
    is_active: true,
  });
};
