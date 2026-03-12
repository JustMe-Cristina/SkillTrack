const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authMiddleware = require("../middleware/auth.middleware");

// helper: genereaza 2 pasi pentru un skill lipsa
function generateStepsForSkill(skillName) {
  return [
    {
      title: `Învață conceptele fundamentale ale competenței ${skillName}`,
      description: `Parcurge noțiunile de bază și principalele concepte asociate competenței ${skillName}.`,
    },
    {
      title: `Aplică ${skillName} într-un mini-proiect`,
      description: `Realizează un exercițiu practic sau un mini-proiect pentru a exersa competența ${skillName}.`,
    },
  ];
}

/**
 * POST /api/roadmaps/generate/:jobId
 * Genereaza roadmap pe baza skill-urilor lipsa pentru un job
 */
router.post("/generate/:jobId", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const jobId = req.params.jobId;

    // 1. verificam jobul
    const [jobs] = await db.query(
      "SELECT * FROM jobs WHERE id = ? AND user_id = ?",
      [jobId, userId],
    );

    if (jobs.length === 0) {
      return res.status(404).json({ message: "Jobul nu a fost găsit." });
    }

    // verificăm dacă există deja un plan de dezvoltare pentru acest job
    const [existingRoadmaps] = await db.query(
      `
  SELECT id, title
  FROM roadmaps
  WHERE user_id = ? AND job_id = ?
  `,
      [userId, jobId],
    );

    if (existingRoadmaps.length > 0) {
      return res.status(409).json({
        message: "Există deja un plan de dezvoltare generat pentru acest job.",
        roadmap_id: existingRoadmaps[0].id,
      });
    }
    const job = jobs[0];

    // 2. luam skill-urile cerute pentru job
    const [jobSkills] = await db.query(
      `
      SELECT js.skill_id, s.name AS skill_name
      FROM job_skills js
      JOIN skills s ON js.skill_id = s.id
      WHERE js.job_id = ?
      `,
      [jobId],
    );

    if (jobSkills.length === 0) {
      return res.status(400).json({
        message:
          "Acest job nu are skill-uri asociate, deci nu se poate genera roadmap.",
      });
    }

    // 3. luam skill-urile userului
    const [userSkills] = await db.query(
      `
      SELECT skill_id
      FROM user_skills
      WHERE user_id = ?
      `,
      [userId],
    );

    const userSkillIds = new Set(userSkills.map((s) => String(s.skill_id)));

    // 4. calculam gaps
    const missingSkills = jobSkills.filter(
      (skill) => !userSkillIds.has(String(skill.skill_id)),
    );

    if (missingSkills.length === 0) {
      return res.status(400).json({
        message: "Nu există skill-uri lipsă. Nu este nevoie de roadmap.",
      });
    }

    // 5. optional: stergem roadmap vechi pentru acelasi job, ca sa nu faci duplicate
    await db.query("DELETE FROM roadmaps WHERE user_id = ? AND job_id = ?", [
      userId,
      jobId,
    ]);

    // 6. cream roadmap-ul
    const title = `Roadmap pentru ${job.title}`;
    const description = `Plan personalizat de învățare generat pe baza skill-urilor lipsă pentru jobul ${job.title}.`;

    const [roadmapResult] = await db.query(
      `
      INSERT INTO roadmaps (user_id, job_id, title, description, status, progress)
      VALUES (?, ?, ?, ?, 'NOT_STARTED', 0)
      `,
      [userId, jobId, title, description],
    );

    const roadmapId = roadmapResult.insertId;

    // 7. cream pasii
    let stepOrder = 1;

    for (const skill of missingSkills) {
      const steps = generateStepsForSkill(skill.skill_name);

      for (const step of steps) {
        await db.query(
          `
          INSERT INTO roadmap_steps
          (roadmap_id, skill_id, step_order, title, description, estimated_days, status)
          VALUES (?, ?, ?, ?, ?, ?, 'NOT_STARTED')
          `,
          [
            roadmapId,
            skill.skill_id,
            stepOrder,
            step.title,
            step.description,
            step.estimated_days,
          ],
        );

        stepOrder++;
      }
    }

    return res.status(201).json({
      message: "Roadmap generat cu succes.",
      roadmap_id: roadmapId,
      missing_skills_count: missingSkills.length,
      total_steps: stepOrder - 1,
    });
  } catch (error) {
    console.error("Eroare la generarea roadmap-ului:", error);
    return res.status(500).json({
      message: "A apărut o eroare la generarea roadmap-ului.",
      error: error.message,
    });
  }
});

/**
 * GET /api/roadmaps
 * Listeaza roadmap-urile userului
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [roadmaps] = await db.query(
      `
      SELECT r.*, j.title AS job_title, j.company
      FROM roadmaps r
      JOIN jobs j ON r.job_id = j.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
      `,
      [userId],
    );

    return res.json(roadmaps);
  } catch (error) {
    console.error("Eroare la listarea roadmap-urilor:", error);
    return res.status(500).json({
      message: "A apărut o eroare la listarea roadmap-urilor.",
      error: error.message,
    });
  }
});

/**
 * GET /api/roadmaps/:id
 * Returneaza roadmap + steps
 */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const roadmapId = req.params.id;

    const [roadmaps] = await db.query(
      `
      SELECT r.*, j.title AS job_title, j.company
      FROM roadmaps r
      JOIN jobs j ON r.job_id = j.id
      WHERE r.id = ? AND r.user_id = ?
      `,
      [roadmapId, userId],
    );

    if (roadmaps.length === 0) {
      return res.status(404).json({ message: "Roadmap-ul nu a fost găsit." });
    }

    const [steps] = await db.query(
      `
      SELECT rs.*, s.name AS skill_name
      FROM roadmap_steps rs
      LEFT JOIN skills s ON rs.skill_id = s.id
      WHERE rs.roadmap_id = ?
      ORDER BY rs.step_order ASC
      `,
      [roadmapId],
    );

    return res.json({
      roadmap: roadmaps[0],
      steps,
    });
  } catch (error) {
    console.error("Eroare la detaliile roadmap-ului:", error);
    return res.status(500).json({
      message: "A apărut o eroare la încărcarea roadmap-ului.",
      error: error.message,
    });
  }
});

/**
 * PATCH /api/roadmaps/steps/:stepId
 * Actualizeaza statusul unui pas
 */
router.patch("/steps/:stepId", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const stepId = req.params.stepId;
    const { status } = req.body;

    const allowedStatuses = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Status invalid." });
    }

    // verificam daca pasul apartine userului
    const [rows] = await db.query(
      `
      SELECT rs.id, rs.roadmap_id
      FROM roadmap_steps rs
      JOIN roadmaps r ON rs.roadmap_id = r.id
      WHERE rs.id = ? AND r.user_id = ?
      `,
      [stepId, userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Pasul nu a fost găsit." });
    }

    const roadmapId = rows[0].roadmap_id;

    // update step status
    await db.query(
      `
      UPDATE roadmap_steps
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [status, stepId],
    );

    // recalcul progress
    const [stats] = await db.query(
      `
      SELECT
        COUNT(*) AS total_steps,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_steps
      FROM roadmap_steps
      WHERE roadmap_id = ?
      `,
      [roadmapId],
    );

    const totalSteps = Number(stats[0].total_steps || 0);
    const completedSteps = Number(stats[0].completed_steps || 0);

    const progress =
      totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);

    let roadmapStatus = "NOT_STARTED";
    if (progress > 0 && progress < 100) roadmapStatus = "IN_PROGRESS";
    if (progress === 100) roadmapStatus = "COMPLETED";

    await db.query(
      `
      UPDATE roadmaps
      SET progress = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [progress, roadmapStatus, roadmapId],
    );

    return res.json({
      message: "Pas actualizat cu succes.",
      progress,
      roadmap_status: roadmapStatus,
    });
  } catch (error) {
    console.error("Eroare la actualizarea pasului:", error);
    return res.status(500).json({
      message: "A apărut o eroare la actualizarea pasului.",
      error: error.message,
    });
  }
});

module.exports = router;
