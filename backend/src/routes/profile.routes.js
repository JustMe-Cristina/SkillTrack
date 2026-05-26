const express = require("express");
const db = require("../config/db");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

function cleanText(value) {
  const text = String(value || "").trim();
  return text.length > 0 ? text : null;
}

router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [rows] = await db.query(
      `
      SELECT
        user_id,
        full_name,
        email,
        headline,
        university,
        specialization,
        study_year,
        city,
        target_role,
        preferred_work_mode,
        about,
        updated_at
      FROM user_profiles
      WHERE user_id = ?
      `,
      [userId]
    );

    if (rows.length === 0) {
      return res.json({
        ok: true,
        profile: null
      });
    }

    return res.json({
      ok: true,
      profile: rows[0]
    });
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "Nu s-a putut încărca profilul."
    });
  }
});

router.put("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const {
      full_name,
      email,
      headline,
      university,
      specialization,
      study_year,
      city,
      target_role,
      preferred_work_mode,
      about
    } = req.body;

    const profile = {
      full_name: cleanText(full_name),
      email: cleanText(email),
      headline: cleanText(headline),
      university: cleanText(university),
      specialization: cleanText(specialization),
      study_year: cleanText(study_year),
      city: cleanText(city),
      target_role: cleanText(target_role),
      preferred_work_mode: cleanText(preferred_work_mode),
      about: cleanText(about)
    };

    await db.query(
      `
      INSERT INTO user_profiles (
        user_id,
        full_name,
        email,
        headline,
        university,
        specialization,
        study_year,
        city,
        target_role,
        preferred_work_mode,
        about
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        full_name = VALUES(full_name),
        email = VALUES(email),
        headline = VALUES(headline),
        university = VALUES(university),
        specialization = VALUES(specialization),
        study_year = VALUES(study_year),
        city = VALUES(city),
        target_role = VALUES(target_role),
        preferred_work_mode = VALUES(preferred_work_mode),
        about = VALUES(about)
      `,
      [
        userId,
        profile.full_name,
        profile.email,
        profile.headline,
        profile.university,
        profile.specialization,
        profile.study_year,
        profile.city,
        profile.target_role,
        profile.preferred_work_mode,
        profile.about
      ]
    );

    const [rows] = await db.query(
      `
      SELECT
        user_id,
        full_name,
        email,
        headline,
        university,
        specialization,
        study_year,
        city,
        target_role,
        preferred_work_mode,
        about,
        updated_at
      FROM user_profiles
      WHERE user_id = ?
      `,
      [userId]
    );

    return res.json({
      ok: true,
      profile: rows[0]
    });
  } catch (err) {
    console.error("PUT PROFILE ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "Nu s-a putut salva profilul."
    });
  }
});

module.exports = router;