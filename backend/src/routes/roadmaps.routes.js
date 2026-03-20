const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authMiddleware = require("../middleware/auth.middleware");
const { logActivity } = require("../utils/activityLogger");

// helper: generează 2 pași pentru un skill lipsă
function generateStepsForSkill(skillName) {
  return [
    {
      title: `Învață conceptele fundamentale ale competenței ${skillName}`,
      description: `Parcurge noțiunile de bază și principalele concepte asociate competenței ${skillName}.`,
    },
    {
      title: `Aplică ${skillName} într-un mini-proiect`,
      description: `Realizează un exercițiu practic sau un mini-proiect pentru a exersa competența ${skillName}.`,
    }
  ];
}

/**
 * POST /api/roadmaps/generate/:jobId
 * Generează roadmap pe baza skill-urilor lipsă pentru un job
 */
router.post("/generate/:jobId", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const jobId = Number(req.params.jobId);

    if (!Number.isFinite(jobId)) {
      return res.status(400).json({
        ok: false,
        message: "ID job invalid."
      });
    }

    // 1. verificăm jobul
    const [jobs] = await db.query(
      `SELECT *
       FROM jobs
       WHERE id = ? AND user_id = ?`,
      [jobId, userId]
    );

    if (jobs.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Jobul nu a fost găsit."
      });
    }

    const job = jobs[0];

    // 2. verificăm dacă există deja roadmap pentru jobul respectiv
    const [existingRoadmaps] = await db.query(
      `SELECT id, title
       FROM roadmaps
       WHERE user_id = ? AND job_id = ?`,
      [userId, jobId]
    );

    if (existingRoadmaps.length > 0) {
      return res.status(409).json({
        ok: false,
        message: "Există deja un plan de dezvoltare generat pentru acest job.",
        roadmap_id: existingRoadmaps[0].id
      });
    }

    // 3. luăm skill-urile cerute pentru job
    const [jobSkills] = await db.query(
      `SELECT
         js.skill_id,
         s.name AS skill_name
       FROM job_skills js
       JOIN skills s ON js.skill_id = s.id
       WHERE js.job_id = ?`,
      [jobId]
    );

    if (jobSkills.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "Acest job nu are skill-uri asociate, deci nu se poate genera roadmap."
      });
    }

    // 4. luăm skill-urile userului
    const [userSkills] = await db.query(
      `SELECT skill_id
       FROM user_skills
       WHERE user_id = ?`,
      [userId]
    );

    const userSkillIds = new Set(userSkills.map((s) => String(s.skill_id)));

    // 5. calculăm gaps
    const missingSkills = jobSkills.filter(
      (skill) => !userSkillIds.has(String(skill.skill_id))
    );

    if (missingSkills.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "Nu există skill-uri lipsă. Nu este nevoie de roadmap."
      });
    }

    // 6. creăm roadmap-ul
    const title = `Roadmap pentru ${job.title}`;
    const description = `Plan personalizat de învățare generat pe baza skill-urilor lipsă pentru jobul ${job.title}.`;

    const [roadmapResult] = await db.query(
      `INSERT INTO roadmaps
        (user_id, job_id, title, description, status, progress)
       VALUES (?, ?, ?, ?, 'NOT_STARTED', 0)`,
      [userId, jobId, title, description]
    );

    const roadmapId = roadmapResult.insertId;

    // 7. creăm pașii
    let stepOrder = 1;

    for (const skill of missingSkills) {
      const steps = generateStepsForSkill(skill.skill_name);

      for (const step of steps) {
        await db.query(
          `INSERT INTO roadmap_steps
            (roadmap_id, skill_id, step_order, title, description, status)
           VALUES (?, ?, ?, ?, ?, 'NOT_STARTED')`,
          [
            roadmapId,
            skill.skill_id,
            stepOrder,
            step.title,
            step.description,
          ]
        );

        stepOrder += 1;
      }
    }

    await logActivity(userId, "ROADMAP_CREATED", "roadmap", roadmapId);

    return res.status(201).json({
      ok: true,
      message: "Roadmap generat cu succes.",
      roadmap_id: roadmapId,
      missing_skills_count: missingSkills.length,
      total_steps: stepOrder - 1
    });
  } catch (error) {
    console.error("Eroare la generarea roadmap-ului:", error);
    return res.status(500).json({
      ok: false,
      message: "A apărut o eroare la generarea roadmap-ului.",
      error: error.message
    });
  }
});

/**
 * GET /api/roadmaps
 * Listează roadmap-urile userului
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [roadmaps] = await db.query(
      `SELECT r.*, j.title AS job_title, j.company
       FROM roadmaps r
       JOIN jobs j ON r.job_id = j.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );

    return res.json({
      ok: true,
      roadmaps
    });
  } catch (error) {
    console.error("Eroare la listarea roadmap-urilor:", error);
    return res.status(500).json({
      ok: false,
      message: "A apărut o eroare la listarea roadmap-urilor.",
      error: error.message
    });
  }
});

/**
 * GET /api/roadmaps/:id
 * Returnează roadmap + steps
 */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const roadmapId = Number(req.params.id);

    if (!Number.isFinite(roadmapId)) {
      return res.status(400).json({
        ok: false,
        message: "ID roadmap invalid."
      });
    }

    const [roadmaps] = await db.query(
      `SELECT r.*, j.title AS job_title, j.company
       FROM roadmaps r
       JOIN jobs j ON r.job_id = j.id
       WHERE r.id = ? AND r.user_id = ?`,
      [roadmapId, userId]
    );

    if (roadmaps.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Roadmap-ul nu a fost găsit."
      });
    }

    const [steps] = await db.query(
      `SELECT rs.*, s.name AS skill_name
       FROM roadmap_steps rs
       LEFT JOIN skills s ON rs.skill_id = s.id
       WHERE rs.roadmap_id = ?
       ORDER BY rs.step_order ASC`,
      [roadmapId]
    );

    return res.json({
      ok: true,
      roadmap: roadmaps[0],
      steps
    });
  } catch (error) {
    console.error("Eroare la detaliile roadmap-ului:", error);
    return res.status(500).json({
      ok: false,
      message: "A apărut o eroare la încărcarea roadmap-ului.",
      error: error.message
    });
  }
});

/**
 * PATCH /api/roadmaps/steps/:stepId
 * Actualizează statusul unui pas și verifică dacă skill-ul asociat a fost finalizat complet
 */
router.patch("/steps/:stepId", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const stepId = Number(req.params.stepId);
    const { status } = req.body;

    const allowedStatuses = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"];

    if (!Number.isFinite(stepId)) {
      return res.status(400).json({
        ok: false,
        message: "ID pas invalid."
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        ok: false,
        message: "Status invalid."
      });
    }

    // verificăm dacă pasul aparține userului + luăm skill_id
    const [rows] = await db.query(
      `SELECT
         rs.id,
         rs.roadmap_id,
         rs.skill_id,
         s.name AS skill_name
       FROM roadmap_steps rs
       JOIN roadmaps r ON rs.roadmap_id = r.id
       LEFT JOIN skills s ON rs.skill_id = s.id
       WHERE rs.id = ? AND r.user_id = ?`,
      [stepId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Pasul nu a fost găsit."
      });
    }

    const stepRow = rows[0];
    const roadmapId = stepRow.roadmap_id;
    const skillId = stepRow.skill_id;
    const skillName = stepRow.skill_name;

    // update status pas
    await db.query(
      `UPDATE roadmap_steps
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, stepId]
    );

    // recalcul progress roadmap
    const [stats] = await db.query(
      `SELECT
         COUNT(*) AS total_steps,
         SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_steps
       FROM roadmap_steps
       WHERE roadmap_id = ?`,
      [roadmapId]
    );

    const totalSteps = Number(stats[0].total_steps || 0);
    const completedSteps = Number(stats[0].completed_steps || 0);

    const progress =
      totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);

    let roadmapStatus = "NOT_STARTED";
    if (progress > 0 && progress < 100) roadmapStatus = "IN_PROGRESS";
    if (progress === 100) roadmapStatus = "COMPLETED";

    await db.query(
      `UPDATE roadmaps
       SET progress = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [progress, roadmapStatus, roadmapId]
    );

    // verificăm dacă toate step-urile pentru skillul curent sunt complete
    let skillCompleted = false;
    let completedSkill = null;

    if (skillId) {
      const [sameSkillSteps] = await db.query(
        `SELECT status
         FROM roadmap_steps
         WHERE roadmap_id = ? AND skill_id = ?`,
        [roadmapId, skillId]
      );

      skillCompleted =
        sameSkillSteps.length > 0 &&
        sameSkillSteps.every((row) => row.status === "COMPLETED");

      if (skillCompleted) {
        completedSkill = {
          skillId: Number(skillId),
          skillName: skillName || "Skill"
        };
      }
    }

    if (status === "COMPLETED") {
      await logActivity(userId, "ROADMAP_STEP_DONE", "roadmap_step", stepId);
    }

    return res.json({
      ok: true,
      message: "Pas actualizat cu succes.",
      progress,
      roadmap_status: roadmapStatus,
      skillCompleted,
      completedSkill
    });
  } catch (error) {
    console.error("Eroare la actualizarea pasului:", error);
    return res.status(500).json({
      ok: false,
      message: "A apărut o eroare la actualizarea pasului.",
      error: error.message
    });
  }
});

module.exports = router;