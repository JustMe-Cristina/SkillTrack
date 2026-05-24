const express = require("express");
const db = require("../config/db");
const auth = require("../middleware/auth.middleware");
const { logActivity } = require("../utils/activityLogger");

const router = express.Router();

const STEP_STATUS = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED"
};

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function buildConceptStep(skill, job, order) {
  return {
    skill_id: null,
    step_order: order,
    title: `Pas ${order}: Înțelege ${skill.name}`,
    description:
      `Începe cu fundamentele competenței ${skill.name} pentru rolul „${job.title}”. ` +
      `Clarifică ce înseamnă această competență în contextul jobului, ce activități implică și ce rezultate se așteaptă de la tine. ` +
      `Scopul acestui pas este să înțelegi conceptele de bază înainte de aplicare practică.`
  };
}

function buildPracticeStep(skill, job, order) {
  return {
    skill_id: null,
    step_order: order,
    title: `Pas ${order}: Exersează ${skill.name}`,
    description:
      `Aplică ${skill.name} pe un scenariu apropiat de rolul „${job.title}”. ` +
      `Folosește cerințele din descrierea jobului pentru a construi un exercițiu practic: notează ce problemă trebuie rezolvată, ce informații sunt necesare și ce livrabil ar trebui produs. ` +
      `Acest pas transformă teoria într-o activitate concretă.`
  };
}

function buildValidationStep(skill, job, order) {
  return {
    skill_id: skill.id,
    step_order: order,
    title: `Pas ${order}: Validează ${skill.name}`,
    description:
      `Finalizează un mini-livrabil care demonstrează competența ${skill.name} pentru rolul „${job.title}”. ` +
      `Exemple: document de cerințe, checklist, mini-raport, test case, user story, query SQL, dashboard simplu sau alt livrabil relevant pentru skill. ` +
      `După finalizarea acestui pas, poți adăuga skillul în catalogul tău de competențe.`
  };
}

function buildInterviewStep(job, order) {
  return {
    skill_id: null,
    step_order: order,
    title: `Pas ${order}: Pregătește exemple pentru interviu`,
    description:
      `Profilul tău acoperă skillurile detectate pentru rolul „${job.title}”. ` +
      `Pregătește 2-3 exemple concrete din experiența ta prin care poți demonstra competențele relevante: situație, acțiune, rezultat. ` +
      `Actualizează CV-ul și pregătește răspunsuri pentru întrebări legate de rol.`
  };
}

function buildGapBasedRoadmapSteps({ job, missingSkills }) {
  if (!missingSkills.length) {
    return [
      {
        skill_id: null,
        step_order: 1,
        title: "Pas 1: Consolidare profil profesional",
        description:
          `Profilul tău acoperă skillurile detectate pentru rolul „${job.title}”. ` +
          `Revizuiește descrierea jobului, actualizează CV-ul și pregătește exemple concrete pentru interviu.`
      },
      buildInterviewStep(job, 2)
    ];
  }

  const steps = [];
  let order = 1;

  for (const skill of missingSkills) {
    steps.push(buildConceptStep(skill, job, order));
    order += 1;

    steps.push(buildPracticeStep(skill, job, order));
    order += 1;

    steps.push(buildValidationStep(skill, job, order));
    order += 1;
  }

  return steps;
}

async function getUserSkillIds(userId) {
  const [rows] = await db.query(
    `SELECT skill_id FROM user_skills WHERE user_id = ?`,
    [userId]
  );

  return new Set(rows.map((row) => Number(row.skill_id)));
}

async function getJobSkills(jobId) {
  const [rows] = await db.query(
    `SELECT
       s.id,
       s.name,
       s.category,
       s.weight
     FROM job_skills js
     JOIN skills s ON s.id = js.skill_id
     WHERE js.job_id = ?
     ORDER BY s.category, s.name`,
    [jobId]
  );

  return rows;
}

async function recalculateRoadmapProgress(connection, roadmapId) {
  const [[stats]] = await connection.query(
    `SELECT
       COUNT(*) AS total_steps,
       SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_steps
     FROM roadmap_steps
     WHERE roadmap_id = ?`,
    [roadmapId]
  );

  const totalSteps = toNumber(stats.total_steps);
  const completedSteps = toNumber(stats.completed_steps);

  const progress =
    totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);

  let status = "NOT_STARTED";

  if (progress === 100) {
    status = "COMPLETED";
  } else if (progress > 0) {
    status = "IN_PROGRESS";
  }

  await connection.query(
    `UPDATE roadmaps
     SET progress = ?, status = ?
     WHERE id = ?`,
    [progress, status, roadmapId]
  );

  return {
    progress,
    status,
    totalSteps,
    completedSteps
  };
}

// GET /api/roadmaps
router.get("/", auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [rows] = await db.query(
      `SELECT
         r.id,
         r.user_id,
         r.job_id,
         r.title,
         r.description,
         r.status,
         r.progress,
         r.created_at,
         r.updated_at,
         j.title AS job_title,
         j.company AS job_company,
         j.match_score AS job_match_score,
         j.ml_predicted_category,
         COUNT(rs.id) AS total_steps,
         SUM(CASE WHEN rs.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_steps
       FROM roadmaps r
       LEFT JOIN jobs j ON j.id = r.job_id
       LEFT JOIN roadmap_steps rs ON rs.roadmap_id = r.id
       WHERE r.user_id = ?
       GROUP BY
         r.id,
         r.user_id,
         r.job_id,
         r.title,
         r.description,
         r.status,
         r.progress,
         r.created_at,
         r.updated_at,
         j.title,
         j.company,
         j.match_score,
         j.ml_predicted_category
       ORDER BY r.created_at DESC`,
      [userId]
    );

    return res.json({
      ok: true,
      roadmaps: rows.map((row) => ({
        ...row,
        progress: toNumber(row.progress),
        total_steps: toNumber(row.total_steps),
        completed_steps: toNumber(row.completed_steps)
      }))
    });
  } catch (err) {
    console.error("GET ROADMAPS ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Nu s-au putut încărca planurile de dezvoltare."
    });
  }
});

// GET /api/roadmaps/:id
router.get("/:id", auth, async (req, res) => {
  const userId = req.user.userId;
  const roadmapId = Number(req.params.id);

  if (!Number.isFinite(roadmapId)) {
    return res.status(400).json({
      ok: false,
      error: "ID roadmap invalid."
    });
  }

  try {
    const [[roadmap]] = await db.query(
      `SELECT
         r.*,
         j.title AS job_title,
         j.company AS job_company,
         j.location AS job_location,
         j.match_score AS job_match_score,
         j.ml_predicted_category,
         j.ml_model,
         j.ml_confidence
       FROM roadmaps r
       LEFT JOIN jobs j ON j.id = r.job_id
       WHERE r.id = ? AND r.user_id = ?`,
      [roadmapId, userId]
    );

    if (!roadmap) {
      return res.status(404).json({
        ok: false,
        error: "Roadmap-ul nu a fost găsit."
      });
    }

    const [steps] = await db.query(
      `SELECT
         rs.id,
         rs.roadmap_id,
         rs.skill_id,
         rs.step_order,
         rs.title,
         rs.description,
         rs.status,
         rs.created_at,
         rs.updated_at,
         s.name AS skill_name,
         s.category AS skill_category
       FROM roadmap_steps rs
       LEFT JOIN skills s ON s.id = rs.skill_id
       WHERE rs.roadmap_id = ?
       ORDER BY rs.step_order ASC`,
      [roadmapId]
    );

    return res.json({
      ok: true,
      roadmap: {
        ...roadmap,
        progress: toNumber(roadmap.progress),
        steps: steps.map((step) => ({
          ...step,
          estimated_days: step.skill_id ? 3 : 2
        }))
      }
    });
  } catch (err) {
    console.error("GET ROADMAP DETAILS ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Nu s-au putut încărca detaliile roadmap-ului."
    });
  }
});

// POST /api/roadmaps/generate/:jobId
router.post("/generate/:jobId", auth, async (req, res) => {
  const userId = req.user.userId;
  const jobId = Number(req.params.jobId);

  if (!Number.isFinite(jobId)) {
    return res.status(400).json({
      ok: false,
      error: "ID job invalid."
    });
  }

  const connection = await db.getConnection();

  try {
    const [[job]] = await connection.query(
      `SELECT
         id,
         title,
         company,
         location,
         match_score,
         ml_predicted_category
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

    const [existingRoadmaps] = await connection.query(
      `SELECT id
       FROM roadmaps
       WHERE user_id = ? AND job_id = ?
       LIMIT 1`,
      [userId, jobId]
    );

    if (existingRoadmaps.length > 0) {
      return res.status(409).json({
        ok: false,
        error: "Există deja un roadmap pentru acest job.",
        roadmapId: existingRoadmaps[0].id
      });
    }

    const jobSkills = await getJobSkills(jobId);
    const userSkillIds = await getUserSkillIds(userId);

    const missingSkills = jobSkills.filter(
      (skill) => !userSkillIds.has(Number(skill.id))
    );

    const steps = buildGapBasedRoadmapSteps({
      job,
      missingSkills
    });

    const title = `Plan de dezvoltare pentru ${job.title}`;

    const description =
      missingSkills.length > 0
        ? `Roadmap generat strict pe baza skillurilor lipsă detectate în cerințele jobului „${job.title}”.`
        : `Roadmap de consolidare pentru rolul „${job.title}”, deoarece profilul tău acoperă skillurile detectate.`;

    await connection.beginTransaction();

    const [roadmapResult] = await connection.query(
      `INSERT INTO roadmaps (
         user_id,
         job_id,
         title,
         description,
         status,
         progress
       )
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, jobId, title, description, "NOT_STARTED", 0]
    );

    const roadmapId = roadmapResult.insertId;

    for (const step of steps) {
      await connection.query(
        `INSERT INTO roadmap_steps (
           roadmap_id,
           skill_id,
           step_order,
           title,
           description,
           status
         )
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          roadmapId,
          step.skill_id,
          step.step_order,
          step.title,
          step.description,
          STEP_STATUS.NOT_STARTED
        ]
      );
    }

    await connection.commit();

    try {
      await logActivity(userId, "ROADMAP_CREATED", {
        roadmapId,
        jobId,
        title
      });
    } catch (logErr) {
      console.warn("Activity log warning:", logErr.message);
    }

    return res.status(201).json({
      ok: true,
      roadmapId,
      id: roadmapId,
      message: "Roadmap generat cu succes."
    });
  } catch (err) {
    await connection.rollback();

    console.error("GENERATE ROADMAP ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Nu s-a putut genera roadmap-ul."
    });
  } finally {
    connection.release();
  }
});

// PATCH /api/roadmaps/steps/:stepId
router.patch("/steps/:stepId", auth, async (req, res) => {
  const userId = req.user.userId;
  const stepId = Number(req.params.stepId);
  const { status } = req.body;

  if (!Number.isFinite(stepId)) {
    return res.status(400).json({
      ok: false,
      error: "ID pas invalid."
    });
  }

  if (!Object.values(STEP_STATUS).includes(status)) {
    return res.status(400).json({
      ok: false,
      error: "Status pas invalid."
    });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [[step]] = await connection.query(
      `SELECT
         rs.id,
         rs.roadmap_id,
         r.user_id
       FROM roadmap_steps rs
       JOIN roadmaps r ON r.id = rs.roadmap_id
       WHERE rs.id = ? AND r.user_id = ?`,
      [stepId, userId]
    );

    if (!step) {
      await connection.rollback();

      return res.status(404).json({
        ok: false,
        error: "Pasul nu a fost găsit."
      });
    }

    await connection.query(
      `UPDATE roadmap_steps
       SET status = ?
       WHERE id = ?`,
      [status, stepId]
    );

    const progressStats = await recalculateRoadmapProgress(
      connection,
      step.roadmap_id
    );

    await connection.commit();

    try {
      if (status === STEP_STATUS.COMPLETED) {
        await logActivity(userId, "ROADMAP_STEP_DONE", {
          stepId,
          roadmapId: step.roadmap_id
        });
      }
    } catch (logErr) {
      console.warn("Activity log warning:", logErr.message);
    }

    return res.json({
      ok: true,
      roadmapId: step.roadmap_id,
      progress: progressStats.progress,
      roadmapStatus: progressStats.status,
      message: "Pas actualizat."
    });
  } catch (err) {
    await connection.rollback();

    console.error("UPDATE ROADMAP STEP ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Nu s-a putut actualiza pasul."
    });
  } finally {
    connection.release();
  }
});

// DELETE /api/roadmaps/:id
router.delete("/:id", auth, async (req, res) => {
  const userId = req.user.userId;
  const roadmapId = Number(req.params.id);

  if (!Number.isFinite(roadmapId)) {
    return res.status(400).json({
      ok: false,
      error: "ID roadmap invalid."
    });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [[roadmap]] = await connection.query(
      `SELECT id FROM roadmaps WHERE id = ? AND user_id = ?`,
      [roadmapId, userId]
    );

    if (!roadmap) {
      await connection.rollback();

      return res.status(404).json({
        ok: false,
        error: "Roadmap-ul nu a fost găsit."
      });
    }

    await connection.query(
      `DELETE FROM roadmap_steps WHERE roadmap_id = ?`,
      [roadmapId]
    );

    await connection.query(
      `DELETE FROM roadmaps WHERE id = ? AND user_id = ?`,
      [roadmapId, userId]
    );

    await connection.commit();

    return res.json({
      ok: true,
      message: "Roadmap șters."
    });
  } catch (err) {
    await connection.rollback();

    console.error("DELETE ROADMAP ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Nu s-a putut șterge roadmap-ul."
    });
  } finally {
    connection.release();
  }
});

module.exports = router;