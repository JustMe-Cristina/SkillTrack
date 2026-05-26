const express = require("express");
const db = require("../config/db");
const auth = require("../middleware/auth.middleware");
const jobAnalysisService = require("../services/jobAnalysis.service");
const { logActivity } = require("../utils/activityLogger");

const router = express.Router();

const ALLOWED_WORK_MODES = ["REMOTE", "HYBRID", "ONSITE"];
const ALLOWED_EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "INTERNSHIP"];
const ALLOWED_STATUSES = [
  "SALVAT",
  "APLICAT",
  "INTERVIU",
  "OFERTA",
  "RESPINS",
  "FARA_RASPUNS"
];

function cleanText(value) {
  const text = String(value || "").trim();
  return text.length > 0 ? text : null;
}

function cleanEnum(value, allowedValues) {
  if (!value) return null;
  return allowedValues.includes(value) ? value : null;
}

async function runJobAnalysis(payload, userId) {
  if (typeof jobAnalysisService === "function") {
    return jobAnalysisService(payload, userId);
  }

  if (typeof jobAnalysisService.analyzeJobData === "function") {
    return jobAnalysisService.analyzeJobData({
      userId,
      title: payload.title,
      company: payload.company,
      location: payload.location,
      description: payload.description
    });
  }

  if (typeof jobAnalysisService.analyzeJob === "function") {
    return jobAnalysisService.analyzeJob(payload, userId);
  }

  if (typeof jobAnalysisService.analyzeJobDescription === "function") {
    return jobAnalysisService.analyzeJobDescription(payload, userId);
  }

  if (typeof jobAnalysisService.analyze === "function") {
    return jobAnalysisService.analyze(payload, userId);
  }

  throw new Error(
    "jobAnalysis.service.js nu exportă o funcție de analiză validă."
  );
}

function normalizeBoolean(value) {
  if (value === true) return 1;
  if (value === false) return 0;
  if (value === 1 || value === 0) return value;
  return null;
}

function safeJson(value) {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

function extractSkillId(skill) {
  return skill.skillId || skill.id || skill.skill_id || null;
}

function extractSkillName(skill) {
  return skill.skill || skill.name || skill.skill_name || "";
}

// POST /api/jobs/analyze
router.post("/analyze", auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    const { title, company, location, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        ok: false,
        error: "Titlul și descrierea jobului sunt obligatorii."
      });
    }

    const analysis = await runJobAnalysis(
      {
        title,
        company,
        location,
        description
      },
      userId
    );

    try {
      await logActivity(userId, "JOB_ANALYZED", {
        title,
        company: company || null
      });
    } catch (logErr) {
      console.warn("Activity log warning:", logErr.message);
    }

    return res.json({
      ok: true,
      ...analysis
    });
  } catch (err) {
    console.error("JOB ANALYZE ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Nu s-a putut analiza jobul."
    });
  }
});

// POST /api/jobs
router.post("/", auth, async (req, res) => {
  const userId = req.user.userId;
  const connection = await db.getConnection();

  try {
    const {
      title,
      company,
      location,
      work_mode,
      employment_type,
      description,
      score,
      detectedSkills,
      matches,
      gaps,
      status,

      experience_min,
      experience_label,
      degree_level,
      degree_label,
      meets_experience_requirement,
      meets_degree_requirement,

      ml_predicted_category,
      ml_model,
      ml_confidence,
      ml_probabilities_json
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        ok: false,
        error: "Titlul și descrierea jobului sunt obligatorii."
      });
    }

    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO jobs (
         user_id,
         title,
         company,
         location,
         work_mode,
         employment_type,
         description,
         match_score,
         status,
         experience_min,
         experience_label,
         degree_level,
         degree_label,
         meets_experience_requirement,
         meets_degree_requirement,
         ml_predicted_category,
         ml_model,
         ml_confidence,
         ml_probabilities_json
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        cleanText(title),
        cleanText(company),
        cleanText(location) || "Nespecificat",
        cleanEnum(work_mode, ALLOWED_WORK_MODES),
        cleanEnum(employment_type, ALLOWED_EMPLOYMENT_TYPES),
        cleanText(description),
        Number(score || 0),
        cleanEnum(status, ALLOWED_STATUSES) || "SALVAT",
        experience_min ?? null,
        cleanText(experience_label),
        cleanText(degree_level),
        cleanText(degree_label),
        normalizeBoolean(meets_experience_requirement),
        normalizeBoolean(meets_degree_requirement),
        ml_predicted_category || null,
        ml_model || null,
        ml_confidence ?? null,
        safeJson(ml_probabilities_json)
      ]
    );

    const jobId = result.insertId;

    const allSkills = [
      ...(Array.isArray(detectedSkills) ? detectedSkills : []),
      ...(Array.isArray(matches) ? matches : []),
      ...(Array.isArray(gaps) ? gaps : [])
    ];

    const uniqueSkillMap = new Map();

    for (const skill of allSkills) {
      const skillId = extractSkillId(skill);
      const skillName = extractSkillName(skill);

      if (skillId) {
        uniqueSkillMap.set(`id-${skillId}`, {
          skillId,
          skillName
        });
      }
    }

    for (const item of uniqueSkillMap.values()) {
      await connection.query(
        `INSERT IGNORE INTO job_skills
         (job_id, skill_id, required_level, detected_by)
         VALUES (?, ?, ?, ?)`,
        [jobId, item.skillId, 1, "ANALYSIS"]
      );
    }

    await connection.commit();

    try {
      await logActivity(userId, "JOB_SAVED", {
        jobId,
        title,
        company: company || null,
        ml_predicted_category: ml_predicted_category || null
      });
    } catch (logErr) {
      console.warn("Activity log warning:", logErr.message);
    }

    return res.status(201).json({
      ok: true,
      jobId,
      id: jobId,
      message: "Job salvat cu succes."
    });
  } catch (err) {
    await connection.rollback();

    console.error("SAVE JOB ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Nu s-a putut salva jobul."
    });
  } finally {
    connection.release();
  }
});

// GET /api/jobs
router.get("/", auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [rows] = await db.query(
      `SELECT
         id,
         title,
         company,
         location,
         work_mode,
         employment_type,
         seniority,
         category,
         ml_predicted_category,
         ml_model,
         ml_confidence,
         match_score,
         status,
         created_at,
         updated_at,
         experience_min,
         experience_label,
         degree_level,
         degree_label,
         meets_experience_requirement,
         meets_degree_requirement
       FROM jobs
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    return res.json({
      ok: true,
      jobs: rows
    });
  } catch (err) {
    console.error("GET JOBS ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Nu s-au putut încărca joburile."
    });
  }
});

// GET /api/jobs/:id
router.get("/:id", auth, async (req, res) => {
  const userId = req.user.userId;
  const jobId = Number(req.params.id);

  if (!Number.isFinite(jobId)) {
    return res.status(400).json({
      ok: false,
      error: "ID job invalid."
    });
  }

  try {
    const [[job]] = await db.query(
      `SELECT *
       FROM jobs
       WHERE id = ? AND user_id = ?`,
      [jobId, userId]
    );

    if (!job) {
      return res.status(404).json({
        ok: false,
        error: "Jobul nu a fost găsit."
      });
    }

    const [skills] = await db.query(
      `SELECT
         s.id,
         s.name,
         s.category,
         s.weight,
         js.required_level,
         js.detected_by
       FROM job_skills js
       JOIN skills s ON s.id = js.skill_id
       WHERE js.job_id = ?
       ORDER BY s.category, s.name`,
      [jobId]
    );

    let mlProbabilities = [];

    try {
      if (job.ml_probabilities_json) {
        mlProbabilities =
          typeof job.ml_probabilities_json === "string"
            ? JSON.parse(job.ml_probabilities_json)
            : job.ml_probabilities_json;
      }
    } catch {
      mlProbabilities = [];
    }

    return res.json({
      ok: true,
      job: {
        ...job,
        ml_probabilities: mlProbabilities,
        skills
      }
    });
  } catch (err) {
    console.error("GET JOB DETAILS ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Nu s-au putut încărca detaliile jobului."
    });
  }
});

// PATCH /api/jobs/:id
// Editare job salvat.
router.patch("/:id", auth, async (req, res) => {
  const userId = req.user.userId;
  const jobId = Number(req.params.id);

  if (!Number.isFinite(jobId)) {
    return res.status(400).json({
      ok: false,
      error: "ID job invalid."
    });
  }

  try {
    const {
      title,
      company,
      location,
      work_mode,
      employment_type,
      description,
      experience_min,
      experience_label,
      degree_level,
      degree_label,
      meets_experience_requirement,
      meets_degree_requirement
    } = req.body;

    const cleanedTitle = cleanText(title);
    const cleanedDescription = cleanText(description);

    if (!cleanedTitle || !cleanedDescription) {
      return res.status(400).json({
        ok: false,
        error: "Titlul și descrierea jobului sunt obligatorii."
      });
    }

    const [result] = await db.query(
      `UPDATE jobs
       SET
         title = ?,
         company = ?,
         location = ?,
         work_mode = ?,
         employment_type = ?,
         description = ?,
         experience_min = ?,
         experience_label = ?,
         degree_level = ?,
         degree_label = ?,
         meets_experience_requirement = ?,
         meets_degree_requirement = ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        cleanedTitle,
        cleanText(company),
        cleanText(location) || "Nespecificat",
        cleanEnum(work_mode, ALLOWED_WORK_MODES),
        cleanEnum(employment_type, ALLOWED_EMPLOYMENT_TYPES),
        cleanedDescription,
        experience_min === "" || experience_min === undefined
          ? null
          : Number(experience_min),
        cleanText(experience_label),
        cleanText(degree_level),
        cleanText(degree_label),
        normalizeBoolean(meets_experience_requirement),
        normalizeBoolean(meets_degree_requirement),
        jobId,
        userId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        ok: false,
        error: "Jobul nu a fost găsit."
      });
    }

    const [[updatedJob]] = await db.query(
      `SELECT *
       FROM jobs
       WHERE id = ? AND user_id = ?`,
      [jobId, userId]
    );

    try {
      await logActivity(userId, "JOB_UPDATED", {
        jobId,
        title: cleanedTitle
      });
    } catch (logErr) {
      console.warn("Activity log warning:", logErr.message);
    }

    return res.json({
      ok: true,
      job: updatedJob,
      message: "Job actualizat cu succes."
    });
  } catch (err) {
    console.error("UPDATE JOB ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Nu s-a putut actualiza jobul."
    });
  }
});

// PATCH /api/jobs/:id/status
router.patch("/:id/status", auth, async (req, res) => {
  const userId = req.user.userId;
  const jobId = Number(req.params.id);
  const { status } = req.body;

  if (!Number.isFinite(jobId)) {
    return res.status(400).json({
      ok: false,
      error: "ID job invalid."
    });
  }

  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({
      ok: false,
      error: "Status invalid."
    });
  }

  try {
    const [result] = await db.query(
      `UPDATE jobs
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [status, jobId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        ok: false,
        error: "Jobul nu a fost găsit."
      });
    }

    return res.json({
      ok: true,
      message: "Status actualizat."
    });
  } catch (err) {
    console.error("UPDATE JOB STATUS ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Nu s-a putut actualiza statusul."
    });
  }
});

// DELETE /api/jobs/:id
router.delete("/:id", auth, async (req, res) => {
  const userId = req.user.userId;
  const jobId = Number(req.params.id);

  if (!Number.isFinite(jobId)) {
    return res.status(400).json({
      ok: false,
      error: "ID job invalid."
    });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `DELETE FROM job_skills WHERE job_id = ?`,
      [jobId]
    );

    const [result] = await connection.query(
      `DELETE FROM jobs WHERE id = ? AND user_id = ?`,
      [jobId, userId]
    );

    await connection.commit();

    if (result.affectedRows === 0) {
      return res.status(404).json({
        ok: false,
        error: "Jobul nu a fost găsit."
      });
    }

    return res.json({
      ok: true,
      message: "Job șters."
    });
  } catch (err) {
    await connection.rollback();

    console.error("DELETE JOB ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Nu s-a putut șterge jobul."
    });
  } finally {
    connection.release();
  }
});

module.exports = router;