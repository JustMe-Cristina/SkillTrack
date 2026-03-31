const express = require("express");
const db = require("../config/db");
const auth = require("../middleware/auth.middleware");
const { logActivity } = require("../utils/activityLogger");
const { recalculateJobsForUser } = require("../services/jobMatch.service");

const router = express.Router();

/**
 * GET /api/user-skills
 * Returnează competențele utilizatorului
 */
router.get("/", auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [rows] = await db.query(
      `
      SELECT
        us.skill_id AS skillId,
        us.level,
        s.name,
        s.category
      FROM user_skills us
      JOIN skills s ON s.id = us.skill_id
      WHERE us.user_id = ?
      ORDER BY s.category ASC, s.name ASC
      `,
      [userId]
    );

    return res.json({
      ok: true,
      skills: rows
    });
  } catch (err) {
    console.error("GET USER SKILLS ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error"
    });
  }
});

/**
 * POST /api/user-skills
 * Adaugă manual o competență
 */
router.post("/", auth, async (req, res) => {
  const userId = req.user.userId;
  const rawSkillId = req.body.skillId ?? req.body.skill_id ?? req.body.id;
  const rawLevel = req.body.level;

  const skillId = Number(rawSkillId);
  const level = Number(rawLevel ?? 2);

  if (!Number.isFinite(skillId) || skillId <= 0) {
    return res.status(400).json({
      ok: false,
      error: "Missing or invalid skillId"
    });
  }

  if (![1, 2, 3].includes(level)) {
    return res.status(400).json({
      ok: false,
      error: "Invalid level"
    });
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [skillRows] = await connection.query(
      `SELECT id, name FROM skills WHERE id = ?`,
      [skillId]
    );

    if (skillRows.length === 0) {
      await connection.rollback();
      connection.release();

      return res.status(404).json({
        ok: false,
        error: "Skill not found"
      });
    }

    const skillName = skillRows[0].name;

    const [existingRows] = await connection.query(
      `SELECT user_id, skill_id
       FROM user_skills
       WHERE user_id = ? AND skill_id = ?`,
      [userId, skillId]
    );

    if (existingRows.length > 0) {
      await connection.rollback();
      connection.release();

      return res.status(409).json({
        ok: false,
        error: "Skill already added"
      });
    }

    await connection.query(
      `INSERT INTO user_skills (user_id, skill_id, level)
       VALUES (?, ?, ?)`,
      [userId, skillId, level]
    );

    await connection.commit();
    connection.release();
    connection = null;

    await recalculateJobsForUser(userId);
    await logActivity(userId, "SKILL_ADDED", "skill", skillId);

    return res.status(201).json({
      ok: true,
      message: "Skill added successfully",
      skill: {
        skillId,
        name: skillName,
        level
      }
    });
  } catch (err) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }

    console.error("ADD USER SKILL ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error"
    });
  }
});

/**
 * DELETE /api/user-skills/:skillId
 * Șterge o competență din profilul utilizatorului
 */
router.delete("/:skillId", auth, async (req, res) => {
  const userId = req.user.userId;
  const skillId = Number(req.params.skillId);

  if (!Number.isFinite(skillId) || skillId <= 0) {
    return res.status(400).json({
      ok: false,
      error: "Invalid skillId"
    });
  }

  try {
    const [result] = await db.query(
      `DELETE FROM user_skills
       WHERE user_id = ? AND skill_id = ?`,
      [userId, skillId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        ok: false,
        error: "Skill not found in user profile"
      });
    }

    await recalculateJobsForUser(userId);
    await logActivity(userId, "SKILL_REMOVED", "skill", skillId);

    return res.json({
      ok: true,
      message: "Skill removed successfully"
    });
  } catch (err) {
    console.error("DELETE USER SKILL ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error"
    });
  }
});

module.exports = router;