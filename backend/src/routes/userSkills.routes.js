const express = require("express");
const db = require("../config/db");
const auth = require("../middleware/auth.middleware");
const {
  recalculateAllJobScoresForUser
} = require("../services/jobMatch.service");

const router = express.Router();

const VALID_LEVELS = [1, 2, 3];

function normalizeLevel(value, fallback = 2) {
  const level = Number(value);
  return VALID_LEVELS.includes(level) ? level : fallback;
}

function normalizeConfidence(value, fallback = 3) {
  const confidence = Number(value);
  if ([1, 2, 3, 4, 5].includes(confidence)) return confidence;
  return fallback;
}

function normalizeSkillId(value) {
  const skillId = Number(value);
  return Number.isInteger(skillId) && skillId > 0 ? skillId : null;
}

async function userHasSkill(userId, skillId) {
  const [rows] = await db.query(
    `SELECT user_id, skill_id
     FROM user_skills
     WHERE user_id = ? AND skill_id = ?
     LIMIT 1`,
    [userId, skillId]
  );

  return rows.length > 0;
}

// GET /api/user-skills
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [rows] = await db.query(
      `SELECT
         us.user_id,
         us.skill_id,
         us.level,
         us.level AS current_level,
         us.confidence,
         us.updated_at,
         s.id,
         s.name,
         s.category
       FROM user_skills us
       JOIN skills s ON s.id = us.skill_id
       WHERE us.user_id = ?
       ORDER BY s.category, s.name`,
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
      error: "Nu s-au putut încărca competențele utilizatorului."
    });
  }
});

// POST /api/user-skills
router.post("/", auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const skillId = normalizeSkillId(req.body.skillId ?? req.body.skill_id);
    const level = normalizeLevel(req.body.level ?? req.body.current_level, 2);
    const confidence = normalizeConfidence(req.body.confidence, 3);

    if (!skillId) {
      return res.status(400).json({
        ok: false,
        error: "ID competență invalid."
      });
    }

    const [skills] = await db.query(
      `SELECT id, name
       FROM skills
       WHERE id = ?
       LIMIT 1`,
      [skillId]
    );

    if (skills.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "Competența nu există în catalog."
      });
    }

    const alreadyExists = await userHasSkill(userId, skillId);

    if (alreadyExists) {
      await db.query(
        `UPDATE user_skills
         SET level = ?, confidence = ?
         WHERE user_id = ? AND skill_id = ?`,
        [level, confidence, userId, skillId]
      );

      const updatedJobs = await recalculateAllJobScoresForUser(userId);

      return res.json({
        ok: true,
        message: "Competența exista deja, iar nivelul a fost actualizat.",
        skillId,
        level,
        confidence,
        updatedJobs
      });
    }

    await db.query(
      `INSERT INTO user_skills (
         user_id,
         skill_id,
         level,
         confidence
       )
       VALUES (?, ?, ?, ?)`,
      [userId, skillId, level, confidence]
    );

    const updatedJobs = await recalculateAllJobScoresForUser(userId);

    return res.status(201).json({
      ok: true,
      message: "Competența a fost adăugată.",
      skillId,
      level,
      confidence,
      updatedJobs
    });
  } catch (err) {
    console.error("ADD USER SKILL ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "Nu s-a putut adăuga competența."
    });
  }
});

async function updateUserSkill(req, res) {
  try {
    const userId = req.user.userId;
    const skillId = normalizeSkillId(req.params.skillId);
    const level = normalizeLevel(req.body.level ?? req.body.current_level, null);
    const confidence =
      req.body.confidence !== undefined
        ? normalizeConfidence(req.body.confidence, 3)
        : null;

    if (!skillId) {
      return res.status(400).json({
        ok: false,
        error: "ID competență invalid."
      });
    }

    if (!level) {
      return res.status(400).json({
        ok: false,
        error: "Nivel invalid. Nivelurile acceptate sunt 1, 2 sau 3."
      });
    }

    let result;

    if (confidence !== null) {
      [result] = await db.query(
        `UPDATE user_skills
         SET level = ?, confidence = ?
         WHERE user_id = ? AND skill_id = ?`,
        [level, confidence, userId, skillId]
      );
    } else {
      [result] = await db.query(
        `UPDATE user_skills
         SET level = ?
         WHERE user_id = ? AND skill_id = ?`,
        [level, userId, skillId]
      );
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        ok: false,
        error: "Competența nu a fost găsită în profilul tău."
      });
    }

    const updatedJobs = await recalculateAllJobScoresForUser(userId);

    return res.json({
      ok: true,
      message: "Competența a fost actualizată.",
      skillId,
      level,
      confidence,
      updatedJobs
    });
  } catch (err) {
    console.error("UPDATE USER SKILL ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "Nu s-a putut actualiza competența."
    });
  }
}

router.patch("/:skillId", auth, updateUserSkill);
router.put("/:skillId", auth, updateUserSkill);

// DELETE /api/user-skills/:skillId
router.delete("/:skillId", auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const skillId = normalizeSkillId(req.params.skillId);

    if (!skillId) {
      return res.status(400).json({
        ok: false,
        error: "ID competență invalid."
      });
    }

    const [result] = await db.query(
      `DELETE FROM user_skills
       WHERE user_id = ? AND skill_id = ?`,
      [userId, skillId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        ok: false,
        error: "Competența nu a fost găsită în profilul tău."
      });
    }

    const updatedJobs = await recalculateAllJobScoresForUser(userId);

    return res.json({
      ok: true,
      message: "Competența a fost ștearsă.",
      skillId,
      updatedJobs
    });
  } catch (err) {
    console.error("DELETE USER SKILL ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "Nu s-a putut șterge competența."
    });
  }
});

module.exports = router;