const express = require("express");
const multer = require("multer");
const auth = require("../middleware/auth.middleware");
const db = require("../config/db");

const cvService = require("../services/cv.service");

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post("/extract", auth, upload.single("cv"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: "No file uploaded",
      });
    }

    const result = await cvService.extractSkillsFromCV(
      req.file,
      req.user.userId
    );

    return res.json({
      ok: true,
      ...result,
    });
  } catch (err) {
    console.error("CV EXTRACT ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: err.message || "Server error",
    });
  }
});

router.post("/apply", auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { skills } = req.body;

    if (!Array.isArray(skills)) {
      return res.status(400).json({ ok: false, error: "Invalid skills list" });
    }

    for (const skillId of skills) {
      await db.query(
        `INSERT IGNORE INTO user_skills (user_id, skill_id, level)
         VALUES (?, ?, 1)`,
        [userId, skillId]
      );
    }

    return res.json({ ok: true, message: "Skills added to profile" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;