const express = require("express");
const db = require("../config/db");
const auth = require("../middleware/auth.middleware");

const { recalculateJobsForUser } = require("../services/jobMatch.service");
const { logActivity } = require("../utils/activityLogger");

const router = express.Router();

/**
 * GET /api/user-skills
 * Listează competențele utilizatorului
 */
router.get("/", auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [rows] = await db.query(
      `SELECT
         us.skill_id,
         us.level,
         us.confidence,
         s.name,
         s.category,
         s.weight
       FROM user_skills us
       JOIN skills s ON s.id = us.skill_id
       WHERE us.user_id = ?
       ORDER BY s.name ASC`,
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
 * POST /api/user-skills/import-from-cv
 * Adaugă competențe confirmate din CV
 * body: { skills: [1, 2, 3] }
 */
router.post("/import-from-cv", auth, async (req, res) => {
  const userId = req.user.userId;
  const { skills } = req.body;

  if (!Array.isArray(skills) || skills.length === 0) {
    return res.status(400).json({
      ok: false,
      error: "No skills provided"
    });
  }

  try {
    let addedCount = 0;

    for (const rawSkillId of skills) {
      const skillId = Number(rawSkillId);

      if (!Number.isFinite(skillId)) {
        continue;
      }

      try {
        await db.query(
          `INSERT INTO user_skills (user_id, skill_id, level, confidence)
           VALUES (?, ?, ?, ?)`,
          [userId, skillId, 1, 3]
        );

        addedCount += 1;

        await logActivity(userId, "SKILL_ADDED", "skill", skillId);
      } catch (err) {
        if (err.code !== "ER_DUP_ENTRY") {
          throw err;
        }
      }
    }

    await recalculateJobsForUser(userId);

    return res.json({
      ok: true,
      message: "Skills imported",
      addedCount
    });
  } catch (err) {
    console.error("IMPORT USER SKILLS FROM CV ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error"
    });
  }
});

/**
 * POST /api/user-skills
 * Adaugă o competență utilizatorului
 */
router.post("/", auth, async (req, res) => {
  const userId = req.user.userId;
  const { skillId, level, confidence } = req.body;

  const numericSkillId = Number(skillId);

  if (!Number.isFinite(numericSkillId)) {
    return res.status(400).json({
      ok: false,
      error: "Missing or invalid skillId"
    });
  }

  try {
    const [existing] = await db.query(
      `SELECT *
       FROM user_skills
       WHERE user_id = ? AND skill_id = ?`,
      [userId, numericSkillId]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        ok: false,
        error: "Skill already exists"
      });
    }

    await db.query(
      `INSERT INTO user_skills (user_id, skill_id, level, confidence)
       VALUES (?, ?, ?, ?)`,
      [userId, numericSkillId, level || 1, confidence || 3]
    );

    await recalculateJobsForUser(userId);
    await logActivity(userId, "SKILL_ADDED", "skill", numericSkillId);

    return res.status(201).json({
      ok: true,
      message: "Skill added"
    });
  } catch (err) {
    console.error("ADD USER SKILL ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error"
    });
  }
});

/**
 * PATCH /api/user-skills/:skillId
 * Actualizează nivelul unei competențe personale
 */
router.patch("/:skillId", auth, async (req, res) => {
  const userId = req.user.userId;
  const skillId = Number(req.params.skillId);
  const { level, confidence } = req.body;

  if (!Number.isFinite(skillId)) {
    return res.status(400).json({
      ok: false,
      error: "Invalid skill id"
    });
  }

  if (level === undefined && confidence === undefined) {
    return res.status(400).json({
      ok: false,
      error: "Nothing to update"
    });
  }

  try {
    const fields = [];
    const values = [];

    if (level !== undefined) {
      fields.push("level = ?");
      values.push(Number(level));
    }

    if (confidence !== undefined) {
      fields.push("confidence = ?");
      values.push(Number(confidence));
    }

    values.push(userId, skillId);

    const [result] = await db.query(
      `UPDATE user_skills
       SET ${fields.join(", ")}
       WHERE user_id = ? AND skill_id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        ok: false,
        error: "Skill not found"
      });
    }

    await recalculateJobsForUser(userId);
    await logActivity(userId, "SKILL_UPDATED", "skill", skillId);

    return res.json({
      ok: true,
      message: "Skill updated"
    });
  } catch (err) {
    console.error("PATCH USER SKILL ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error"
    });
  }
});

/**
 * DELETE /api/user-skills/:skillId
 * Șterge o competență personală
 */
router.delete("/:skillId", auth, async (req, res) => {
  const userId = req.user.userId;
  const skillId = Number(req.params.skillId);

  if (!Number.isFinite(skillId)) {
    return res.status(400).json({
      ok: false,
      error: "Invalid skill id"
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
        error: "Skill not found"
      });
    }

    await recalculateJobsForUser(userId);
    await logActivity(userId, "SKILL_DELETED", "skill", skillId);

    return res.json({
      ok: true,
      message: "Skill deleted"
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