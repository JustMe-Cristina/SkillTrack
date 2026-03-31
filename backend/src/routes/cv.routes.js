const express = require("express");
const multer = require("multer");
const auth = require("../middleware/auth.middleware");
const db = require("../config/db");
const { logActivity } = require("../utils/activityLogger");
const { extractAndDetectSkills } = require("../services/cv.service");
const { recalculateJobsForUser } = require("../services/jobMatch.service");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

router.post("/extract", auth, upload.single("cv"), async (req, res) => {
  const userId = req.user.userId;

  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: "No file uploaded"
      });
    }

    const { detectedSkills } = await extractAndDetectSkills(req.file);

    const detectedIds = detectedSkills.map((skill) => Number(skill.skillId));
    let existingSkillIds = new Set();

    if (detectedIds.length > 0) {
      const placeholders = detectedIds.map(() => "?").join(",");

      const [existingRows] = await db.query(
        `SELECT skill_id
         FROM user_skills
         WHERE user_id = ? AND skill_id IN (${placeholders})`,
        [userId, ...detectedIds]
      );

      existingSkillIds = new Set(
        existingRows.map((row) => Number(row.skill_id))
      );
    }

    const enrichedSkills = detectedSkills.map((skill) => ({
      ...skill,
      alreadyAdded: existingSkillIds.has(Number(skill.skillId)),
      selected: !existingSkillIds.has(Number(skill.skillId)),
      level: 2
    }));

    return res.json({
      ok: true,
      detectedSkills: enrichedSkills
    });
  } catch (err) {
    console.error("CV EXTRACT ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Server error"
    });
  }
});

router.post("/apply", auth, async (req, res) => {
  const userId = req.user.userId;
  const { skills } = req.body;

  let connection;

  try {
    if (!Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "No skills selected"
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    let importedCount = 0;

    for (const skill of skills) {
      const skillId = Number(skill.skillId ?? skill.skill_id ?? skill.id);
      const level = Number(skill.level || 2);

      if (!Number.isFinite(skillId)) {
        continue;
      }

      const [result] = await connection.query(
        `INSERT IGNORE INTO user_skills (user_id, skill_id, level)
         VALUES (?, ?, ?)`,
        [userId, skillId, level]
      );

      if (result.affectedRows > 0) {
        importedCount += 1;
      }
    }

    await connection.commit();
    connection.release();
    connection = null;

    await recalculateJobsForUser(userId);
    await logActivity(userId, "CV_APPLIED", "cv", null);

    return res.json({
      ok: true,
      message: "Selected skills added successfully",
      importedCount
    });
  } catch (err) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }

    console.error("CV APPLY ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Server error"
    });
  }
});

module.exports = router;