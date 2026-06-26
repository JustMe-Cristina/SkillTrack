const express = require("express");
const db = require("../config/db");
const auth = require("../middleware/auth.middleware");

const router = express.Router();

function cleanText(value) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [rows] = await db.query(
      `SELECT
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
       WHERE user_id = ?`,
      [userId]
    );

    return res.json({
      ok: true,
      profile: rows[0] || null
    });
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "Nu s-a putut încărca profilul."
    });
  }
});

router.put("/", auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const profile = {
      full_name: cleanText(req.body.full_name),
      email: cleanText(req.body.email),
      headline: cleanText(req.body.headline),
      university: cleanText(req.body.university),
      specialization: cleanText(req.body.specialization),
      study_year: cleanText(req.body.study_year),
      city: cleanText(req.body.city),
      target_role: cleanText(req.body.target_role),
      preferred_work_mode: cleanText(req.body.preferred_work_mode),
      about: cleanText(req.body.about)
    };

    await db.query(
      `INSERT INTO user_profiles (
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
          about = VALUES(about)`,
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
      `SELECT
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
       WHERE user_id = ?`,
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

router.delete("/account", auth, async (req, res) => {
  const userId = req.user.userId;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      "DELETE FROM user_profiles WHERE user_id = ?",
      [userId]
    );

    const [result] = await connection.query(
      "DELETE FROM users WHERE id = ?",
      [userId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();

      return res.status(404).json({
        ok: false,
        error: "Utilizatorul nu a fost găsit."
      });
    }

    await connection.commit();

    return res.json({
      ok: true,
      message: "Contul a fost șters cu succes."
    });
  } catch (err) {
    await connection.rollback();

    console.error("DELETE ACCOUNT ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "Nu s-a putut șterge contul."
    });
  } finally {
    connection.release();
  }
});

module.exports = router;