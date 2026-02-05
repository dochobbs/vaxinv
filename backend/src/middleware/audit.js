async function auditLog(db, { userId, locationId, action, entityType, entityId, details }) {
  await db('audit_log').insert({
    user_id: userId,
    location_id: locationId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: JSON.stringify(details),
  });
}

module.exports = { auditLog };
