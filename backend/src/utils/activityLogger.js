const db = require("../config/db");

async function logActivity(
  userId,
  actionType,
  entityType = null,
  entityId = null
) {
  try {
    await db.query(
      `INSERT INTO activity_log (
         user_id,
         action_type,
         entity_type,
         entity_id
       )
       VALUES (?, ?, ?, ?)`,
      [userId, actionType, entityType, entityId]
    );
  } catch (err) {
    console.error("ACTIVITY LOG ERROR:", err);
  }
}

module.exports = {
  logActivity
};