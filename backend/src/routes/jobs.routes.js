const express = require("express");
const db = require("../config/db");
const auth = require("../middleware/auth.middleware");
const { skillMatchesText } = require("../utils/skillAliases");
const { logActivity } = require("../utils/activityLogger");

const router = express.Router();

function detectWorkMode(description) {
  const text = String(description || "").toLowerCase();

  if (text.includes("hybrid") || text.includes("hibrid")) {
    return "HYBRID";
  }

  if (
    text.includes("remote") ||
    text.includes("work from home") ||
    text.includes("fully remote")
  ) {
    return "REMOTE";
  }

  if (
    text.includes("on-site") ||
    text.includes("onsite") ||
    text.includes("on site") ||
    text.includes("la fața locului") ||
    text.includes("la fata locului")
  ) {
    return "ONSITE";
  }

  return null;
}

function detectEmploymentType(description) {
  const text = String(description || "").toLowerCase();

  if (text.includes("internship")) {
    return "INTERNSHIP";
  }

  if (
    text.includes("part-time") ||
    text.includes("part time") ||
    text.includes("parttime")
  ) {
    return "PART_TIME";
  }

  if (
    text.includes("full-time") ||
    text.includes("full time") ||
    text.includes("fulltime")
  ) {
    return "FULL_TIME";
  }

  return null;
}

function detectLocation(description) {
  const text = String(description || "").toLowerCase();

  const cityMap = [
    { keywords: ["cluj-napoca", "cluj napoca", "cluj"], value: "Cluj-Napoca" },
    { keywords: ["bucurești", "bucuresti"], value: "București" },
    { keywords: ["timișoara", "timisoara"], value: "Timișoara" },
    { keywords: ["iași", "iasi"], value: "Iași" },
    { keywords: ["sibiu"], value: "Sibiu" },
    { keywords: ["brașov", "brasov"], value: "Brașov" },
    { keywords: ["oradea"], value: "Oradea" },
    { keywords: ["berlin"], value: "Berlin" },
    { keywords: ["amsterdam"], value: "Amsterdam" },
    { keywords: ["london"], value: "Londra" },
    { keywords: ["munich", "münchen"], value: "Munchen" },
    { keywords: ["dublin"], value: "Dublin" }
  ];

  for (const city of cityMap) {
    for (const keyword of city.keywords) {
      if (text.includes(keyword)) {
        return city.value;
      }
    }
  }

  if (text.includes("remote romania") || text.includes("remote românia")) {
    return "Remote (România)";
  }

  if (text.includes("romania") || text.includes("românia")) {
    return "România";
  }

  return null;
}

async function analyzeJobData(
  userId,
  title,
  company,
  location,
  work_mode,
  employment_type,
  description
) {
  const text = String(description || "").toLowerCase();

  const [skills] = await db.query(
    "SELECT id, name, category FROM skills ORDER BY name ASC"
  );

  const detected = skills.filter((skill) =>
    skillMatchesText(skill.name, text)
  );

  const detectedIds = detected.map((s) => Number(s.id));
  const userSkillIds = new Set();

  if (detectedIds.length > 0) {
    const placeholders = detectedIds.map(() => "?").join(",");

    const [userSkillRows] = await db.query(
      `SELECT skill_id
       FROM user_skills
       WHERE user_id = ? AND skill_id IN (${placeholders})`,
      [userId, ...detectedIds]
    );

    for (const row of userSkillRows) {
      userSkillIds.add(Number(row.skill_id));
    }
  }

  const matches = [];
  const gaps = [];
  const detectedSkills = [];

  for (const skill of detected) {
    const hasSkill = userSkillIds.has(Number(skill.id));

    detectedSkills.push({
      skillId: Number(skill.id),
      name: skill.name,
      category: skill.category
    });

    if (hasSkill) {
      matches.push({
        skill: skill.name,
        skillId: Number(skill.id)
      });
    } else {
      gaps.push({
        skill: skill.name,
        skillId: Number(skill.id)
      });
    }
  }

  const totalSkills = detected.length;
  const matchedSkills = matches.length;

  const score =
    totalSkills === 0 ? 0 : Math.round((matchedSkills / totalSkills) * 100);

  const detectedLocation =
    location && String(location).trim()
      ? String(location).trim()
      : detectLocation(description);

  const detectedWorkMode =
    work_mode && String(work_mode).trim()
      ? work_mode
      : detectWorkMode(description);

  const detectedEmploymentType =
    employment_type && String(employment_type).trim()
      ? employment_type
      : detectEmploymentType(description);

  return {
    title,
    company,
    location: detectedLocation,
    work_mode: detectedWorkMode,
    employment_type: detectedEmploymentType,
    description,
    detectedSkills,
    score,
    matches,
    gaps
  };
}

/**
 * POST /api/jobs/analyze
 * Analizează jobul fără să îl salveze
 */
router.post("/analyze", auth, async (req, res) => {
  const {
    title,
    company,
    location,
    work_mode,
    employment_type,
    description
  } = req.body;

  const userId = req.user.userId;

  if (!title || !description) {
    return res.status(400).json({
      ok: false,
      error: "Missing title/description"
    });
  }

  try {
    const analysis = await analyzeJobData(
      userId,
      title,
      company,
      location,
      work_mode,
      employment_type,
      description
    );

    await logActivity(userId, "JOB_ANALYZED", "job", null);

    return res.json({
      ok: true,
      ...analysis
    });
  } catch (err) {
    console.error("JOB ANALYZE ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error"
    });
  }
});

/**
 * POST /api/jobs
 * Salvează jobul analizat
 */
router.post("/", auth, async (req, res) => {
  const userId = req.user.userId;

  const {
    title,
    company,
    location,
    work_mode,
    employment_type,
    description,
    score,
    detectedSkills,
    status,
    applied_at,
    start_period
  } = req.body;

  if (!title || !description) {
    return res.status(400).json({
      ok: false,
      error: "Missing title/description"
    });
  }

  if (!location || !String(location).trim()) {
    return res.status(400).json({
      ok: false,
      error: "Missing location"
    });
  }

  try {
    const [jobResult] = await db.query(
      `INSERT INTO jobs
        (user_id, title, company, location, work_mode, employment_type, description, match_score, status, applied_at, start_period)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        title,
        company || null,
        String(location).trim(),
        work_mode || null,
        employment_type || null,
        description,
        Number(score) || 0,
        status || "SALVAT",
        applied_at || null,
        start_period || null
      ]
    );

    const jobId = jobResult.insertId;

    if (Array.isArray(detectedSkills) && detectedSkills.length > 0) {
      for (const skill of detectedSkills) {
        await db.query(
          `INSERT IGNORE INTO job_skills
            (job_id, skill_id, required_level, detected_by)
           VALUES (?, ?, ?, ?)`,
          [jobId, Number(skill.skillId), 1, "KEYWORD"]
        );
      }
    }

    await logActivity(userId, "JOB_SAVED", "job", jobId);

    return res.status(201).json({
      ok: true,
      message: "Job saved",
      jobId
    });
  } catch (err) {
    console.error("JOB SAVE ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error"
    });
  }
});

/**
 * GET /api/jobs
 * Listează joburile utilizatorului
 */
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
         description,
         match_score,
         status,
         applied_at,
         start_period,
         created_at,
         updated_at
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
      error: "Server error"
    });
  }
});

/**
 * GET /api/jobs/:id
 * Returnează detaliile unui job + analiza completă recalculată dinamic
 */
router.get("/:id", auth, async (req, res) => {
  const userId = req.user.userId;
  const jobId = Number(req.params.id);

  if (!Number.isFinite(jobId)) {
    return res.status(400).json({
      ok: false,
      error: "Invalid job id"
    });
  }

  try {
    const [jobs] = await db.query(
      `SELECT
         id,
         title,
         company,
         location,
         work_mode,
         employment_type,
         description,
         match_score,
         status,
         applied_at,
         start_period,
         created_at,
         updated_at
       FROM jobs
       WHERE id = ? AND user_id = ?`,
      [jobId, userId]
    );

    if (jobs.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "Job not found"
      });
    }

    const [requiredSkills] = await db.query(
      `SELECT
         s.id AS skill_id,
         s.name,
         s.category,
         js.required_level,
         js.detected_by
       FROM job_skills js
       JOIN skills s ON s.id = js.skill_id
       WHERE js.job_id = ?
       ORDER BY s.category, s.name`,
      [jobId]
    );

    const skillIds = requiredSkills.map((s) => Number(s.skill_id));
    const userSkillIds = new Set();

    if (skillIds.length > 0) {
      const placeholders = skillIds.map(() => "?").join(",");

      const [userSkillRows] = await db.query(
        `SELECT skill_id
         FROM user_skills
         WHERE user_id = ? AND skill_id IN (${placeholders})`,
        [userId, ...skillIds]
      );

      for (const row of userSkillRows) {
        userSkillIds.add(Number(row.skill_id));
      }
    }

    const matches = [];
    const gaps = [];

    for (const skill of requiredSkills) {
      const hasSkill = userSkillIds.has(Number(skill.skill_id));

      if (hasSkill) {
        matches.push({
          skill: skill.name,
          skillId: Number(skill.skill_id)
        });
      } else {
        gaps.push({
          skill: skill.name,
          skillId: Number(skill.skill_id)
        });
      }
    }

    const totalSkills = requiredSkills.length;
    const matchedSkills = matches.length;

    const dynamicScore =
      totalSkills === 0 ? 0 : Math.round((matchedSkills / totalSkills) * 100);

    return res.json({
      ok: true,
      job: {
        ...jobs[0],
        match_score: dynamicScore,
        requiredSkills,
        matches,
        gaps
      }
    });
  } catch (err) {
    console.error("GET JOB DETAILS ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error"
    });
  }
});

/**
 * PATCH /api/jobs/:id
 * Actualizează metadatele jobului
 */
router.patch("/:id", auth, async (req, res) => {
  const userId = req.user.userId;
  const jobId = Number(req.params.id);

  const {
    company,
    location,
    work_mode,
    employment_type,
    status,
    applied_at,
    start_period
  } = req.body;

  if (!Number.isFinite(jobId)) {
    return res.status(400).json({
      ok: false,
      error: "Invalid job id"
    });
  }

  const allowedStatuses = ["SALVAT", "APLICAT", "IN_PROCES", "RESPINS", "ACCEPTAT"];
  const allowedWorkModes = ["REMOTE", "HYBRID", "ONSITE"];
  const allowedEmploymentTypes = ["FULL_TIME", "PART_TIME", "INTERNSHIP"];

  const fields = [];
  const values = [];

  try {
    if (company !== undefined) {
      fields.push("company = ?");
      values.push(company || null);
    }

    if (location !== undefined) {
      if (!String(location).trim()) {
        return res.status(400).json({
          ok: false,
          error: "Missing location"
        });
      }

      fields.push("location = ?");
      values.push(String(location).trim());
    }

    if (work_mode !== undefined) {
      if (work_mode !== null && work_mode !== "" && !allowedWorkModes.includes(work_mode)) {
        return res.status(400).json({
          ok: false,
          error: "Invalid work mode"
        });
      }

      fields.push("work_mode = ?");
      values.push(work_mode || null);
    }

    if (employment_type !== undefined) {
      if (
        employment_type !== null &&
        employment_type !== "" &&
        !allowedEmploymentTypes.includes(employment_type)
      ) {
        return res.status(400).json({
          ok: false,
          error: "Invalid employment type"
        });
      }

      fields.push("employment_type = ?");
      values.push(employment_type || null);
    }

    if (status !== undefined) {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          ok: false,
          error: "Invalid status"
        });
      }

      fields.push("status = ?");
      values.push(status);
    }

    if (applied_at !== undefined) {
      fields.push("applied_at = ?");
      values.push(applied_at || null);
    }

    if (start_period !== undefined) {
      fields.push("start_period = ?");
      values.push(start_period || null);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Nothing to update"
      });
    }

    values.push(jobId, userId);

    const [result] = await db.query(
      `UPDATE jobs
       SET ${fields.join(", ")}
       WHERE id = ? AND user_id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        ok: false,
        error: "Job not found"
      });
    }

    return res.json({
      ok: true,
      message: "Job updated"
    });
  } catch (err) {
    console.error("PATCH JOB ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error"
    });
  }
});

/**
 * DELETE /api/jobs/:id
 * Șterge un job
 */
router.delete("/:id", auth, async (req, res) => {
  const userId = req.user.userId;
  const jobId = Number(req.params.id);

  if (!Number.isFinite(jobId)) {
    return res.status(400).json({
      ok: false,
      error: "Invalid job id"
    });
  }

  try {
    const [result] = await db.query(
      `DELETE FROM jobs
       WHERE id = ? AND user_id = ?`,
      [jobId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        ok: false,
        error: "Job not found"
      });
    }

    return res.json({
      ok: true,
      message: "Job deleted"
    });
  } catch (err) {
    console.error("DELETE JOB ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error"
    });
  }
});

module.exports = router;