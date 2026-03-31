const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/auth.middleware");

/**
 * GET /api/user/profile
 * Returnează profilul utilizatorului + sumar cont
 */
router.get("/profile", auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [users] = await db.query(
      `
      SELECT
        id,
        name,
        email,
        headline,
        city,
        university,
        specialization,
        study_year,
        target_role,
        preferred_work_mode,
        preferred_employment_type,
        bio,
        monthly_report_enabled,
        email_notifications_enabled,
        job_recommendations_enabled
      FROM users
      WHERE id = ?
      `,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Utilizatorul nu a fost găsit."
      });
    }

    const profile = users[0];

    const [[skillsStats]] = await db.query(
      `
      SELECT COUNT(*) AS total_skills
      FROM user_skills
      WHERE user_id = ?
      `,
      [userId]
    );

    const [[jobsStats]] = await db.query(
      `
      SELECT COUNT(*) AS saved_jobs
      FROM jobs
      WHERE user_id = ?
      `,
      [userId]
    );

    const [[roadmapsStats]] = await db.query(
      `
      SELECT
        COUNT(*) AS roadmaps_count,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_roadmaps
      FROM roadmaps
      WHERE user_id = ?
      `,
      [userId]
    );

    return res.json({
      ok: true,
      profile: {
        ...profile,
        total_skills: Number(skillsStats.total_skills || 0),
        saved_jobs: Number(jobsStats.saved_jobs || 0),
        roadmaps_count: Number(roadmapsStats.roadmaps_count || 0),
        completed_roadmaps: Number(roadmapsStats.completed_roadmaps || 0)
      }
    });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);
    return res.status(500).json({
      ok: false,
      message: "A apărut o eroare la încărcarea profilului.",
      error: error.message
    });
  }
});

/**
 * PATCH /api/user/profile
 * Actualizează profilul utilizatorului
 */
router.patch("/profile", auth, async (req, res) => {
  const userId = req.user.userId;

  const {
    name,
    headline,
    city,
    university,
    specialization,
    study_year,
    target_role,
    preferred_work_mode,
    preferred_employment_type,
    bio,
    monthly_report_enabled,
    email_notifications_enabled,
    job_recommendations_enabled
  } = req.body;

  const allowedWorkModes = ["REMOTE", "HYBRID", "ONSITE"];
  const allowedEmploymentTypes = ["INTERNSHIP", "PART_TIME", "FULL_TIME"];

  const fields = [];
  const values = [];

  try {
    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({
          ok: false,
          message: "Numele nu poate fi gol."
        });
      }

      fields.push("name = ?");
      values.push(String(name).trim());
    }

    if (headline !== undefined) {
      fields.push("headline = ?");
      values.push(headline ? String(headline).trim() : null);
    }

    if (city !== undefined) {
      fields.push("city = ?");
      values.push(city ? String(city).trim() : null);
    }

    if (university !== undefined) {
      fields.push("university = ?");
      values.push(university ? String(university).trim() : null);
    }

    if (specialization !== undefined) {
      fields.push("specialization = ?");
      values.push(specialization ? String(specialization).trim() : null);
    }

    if (study_year !== undefined) {
      fields.push("study_year = ?");
      values.push(study_year ? String(study_year).trim() : null);
    }

    if (target_role !== undefined) {
      fields.push("target_role = ?");
      values.push(target_role ? String(target_role).trim() : null);
    }

    if (preferred_work_mode !== undefined) {
      if (
        preferred_work_mode !== null &&
        preferred_work_mode !== "" &&
        !allowedWorkModes.includes(preferred_work_mode)
      ) {
        return res.status(400).json({
          ok: false,
          message: "Work mode invalid."
        });
      }

      fields.push("preferred_work_mode = ?");
      values.push(preferred_work_mode || null);
    }

    if (preferred_employment_type !== undefined) {
      if (
        preferred_employment_type !== null &&
        preferred_employment_type !== "" &&
        !allowedEmploymentTypes.includes(preferred_employment_type)
      ) {
        return res.status(400).json({
          ok: false,
          message: "Tip de angajare invalid."
        });
      }

      fields.push("preferred_employment_type = ?");
      values.push(preferred_employment_type || null);
    }

    if (bio !== undefined) {
      fields.push("bio = ?");
      values.push(bio ? String(bio).trim() : null);
    }

    if (monthly_report_enabled !== undefined) {
      fields.push("monthly_report_enabled = ?");
      values.push(monthly_report_enabled ? 1 : 0);
    }

    if (email_notifications_enabled !== undefined) {
      fields.push("email_notifications_enabled = ?");
      values.push(email_notifications_enabled ? 1 : 0);
    }

    if (job_recommendations_enabled !== undefined) {
      fields.push("job_recommendations_enabled = ?");
      values.push(job_recommendations_enabled ? 1 : 0);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "Nu există câmpuri de actualizat."
      });
    }

    values.push(userId);

    await db.query(
      `
      UPDATE users
      SET ${fields.join(", ")}
      WHERE id = ?
      `,
      values
    );

    const [updatedUsers] = await db.query(
      `
      SELECT
        id,
        name,
        email,
        headline,
        city,
        university,
        specialization,
        study_year,
        target_role,
        preferred_work_mode,
        preferred_employment_type,
        bio,
        monthly_report_enabled,
        email_notifications_enabled,
        job_recommendations_enabled
      FROM users
      WHERE id = ?
      `,
      [userId]
    );

    return res.json({
      ok: true,
      message: "Profil actualizat cu succes.",
      profile: updatedUsers[0]
    });
  } catch (error) {
    console.error("PATCH PROFILE ERROR:", error);
    return res.status(500).json({
      ok: false,
      message: "A apărut o eroare la actualizarea profilului.",
      error: error.message
    });
  }
});

module.exports = router;