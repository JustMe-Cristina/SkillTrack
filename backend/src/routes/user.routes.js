const express = require("express");
const db = require("../config/db");
const auth = require("../middleware/auth.middleware");

const router = express.Router();

const ALLOWED_WORK_MODES = ["REMOTE", "HYBRID", "ONSITE"];
const ALLOWED_EMPLOYMENT_TYPES = ["INTERNSHIP", "PART_TIME", "FULL_TIME"];

function cleanText(value) {
  const text = String(value || "").trim();
  return text.length > 0 ? text : null;
}

function toBoolean(value) {
  return value ? 1 : 0;
}

router.get("/profile", auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [users] = await db.query(
      `SELECT
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
       WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "Utilizatorul nu a fost găsit."
      });
    }

    const profile = users[0];

    const [[skillsStats]] = await db.query(
      `SELECT COUNT(*) AS total_skills
       FROM user_skills
       WHERE user_id = ?`,
      [userId]
    );

    const [[jobsStats]] = await db.query(
      `SELECT COUNT(*) AS saved_jobs
       FROM jobs
       WHERE user_id = ?`,
      [userId]
    );

    const [[roadmapsStats]] = await db.query(
      `SELECT
         COUNT(*) AS roadmaps_count,
         SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_roadmaps
       FROM roadmaps
       WHERE user_id = ?`,
      [userId]
    );

    return res.json({
      ok: true,
      profile: {
        ...profile,
        total_skills: Number(skillsStats.total_skills || 0),
        saved_jobs: Number(jobsStats.saved_jobs || 0),
        roadmaps_count: Number(roadmapsStats.roadmaps_count || 0),
        completed_roadmaps: Number(
          roadmapsStats.completed_roadmaps || 0
        )
      }
    });
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "Nu s-a putut încărca profilul."
    });
  }
});

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

  try {
    const updates = [];
    const values = [];

    if (name !== undefined) {
      const cleaned = cleanText(name);

      if (!cleaned) {
        return res.status(400).json({
          ok: false,
          error: "Numele nu poate fi gol."
        });
      }

      updates.push("name = ?");
      values.push(cleaned);
    }

    if (headline !== undefined) {
      updates.push("headline = ?");
      values.push(cleanText(headline));
    }

    if (city !== undefined) {
      updates.push("city = ?");
      values.push(cleanText(city));
    }

    if (university !== undefined) {
      updates.push("university = ?");
      values.push(cleanText(university));
    }

    if (specialization !== undefined) {
      updates.push("specialization = ?");
      values.push(cleanText(specialization));
    }

    if (study_year !== undefined) {
      updates.push("study_year = ?");
      values.push(cleanText(study_year));
    }

    if (target_role !== undefined) {
      updates.push("target_role = ?");
      values.push(cleanText(target_role));
    }

    if (preferred_work_mode !== undefined) {
      if (
        preferred_work_mode &&
        !ALLOWED_WORK_MODES.includes(preferred_work_mode)
      ) {
        return res.status(400).json({
          ok: false,
          error: "Work mode invalid."
        });
      }

      updates.push("preferred_work_mode = ?");
      values.push(preferred_work_mode || null);
    }

    if (preferred_employment_type !== undefined) {
      if (
        preferred_employment_type &&
        !ALLOWED_EMPLOYMENT_TYPES.includes(
          preferred_employment_type
        )
      ) {
        return res.status(400).json({
          ok: false,
          error: "Tip de angajare invalid."
        });
      }

      updates.push("preferred_employment_type = ?");
      values.push(preferred_employment_type || null);
    }

    if (bio !== undefined) {
      updates.push("bio = ?");
      values.push(cleanText(bio));
    }

    if (monthly_report_enabled !== undefined) {
      updates.push("monthly_report_enabled = ?");
      values.push(toBoolean(monthly_report_enabled));
    }

    if (email_notifications_enabled !== undefined) {
      updates.push("email_notifications_enabled = ?");
      values.push(toBoolean(email_notifications_enabled));
    }

    if (job_recommendations_enabled !== undefined) {
      updates.push("job_recommendations_enabled = ?");
      values.push(toBoolean(job_recommendations_enabled));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Nu există câmpuri de actualizat."
      });
    }

    values.push(userId);

    await db.query(
      `UPDATE users
       SET ${updates.join(", ")}
       WHERE id = ?`,
      values
    );

    const [updatedUsers] = await db.query(
      `SELECT
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
       WHERE id = ?`,
      [userId]
    );

    return res.json({
      ok: true,
      message: "Profil actualizat cu succes.",
      profile: updatedUsers[0]
    });
  } catch (err) {
    console.error("PATCH PROFILE ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "Nu s-a putut actualiza profilul."
    });
  }
});

module.exports = router;