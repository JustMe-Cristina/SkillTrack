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
      estimated_days: 3
    },
    {
      title: `Aplică ${skillName} într-un mini-proiect`,
      description: `Realizează un exercițiu practic sau un mini-proiect pentru a exersa competența ${skillName}.`,
      estimated_days: 5
    }
  ];
}

function getSkillGroupStatus(steps) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return "NOT_STARTED";
  }

  const allCompleted = steps.every((step) => step.status === "COMPLETED");
  if (allCompleted) {
    return "COMPLETED";
  }

  const hasInProgress = steps.some((step) => step.status === "IN_PROGRESS");
  if (hasInProgress) {
    return "IN_PROGRESS";
  }

  return "NOT_STARTED";
}

function getSkillGroupSortWeight(status) {
  if (status === "IN_PROGRESS") return 1;
  if (status === "NOT_STARTED") return 2;
  if (status === "COMPLETED") return 3;
  return 4;
}

function buildSkillGroupsFromSteps(steps) {
  const groupsMap = new Map();

  for (const step of steps) {
    const key = step.skill_id
      ? `skill-${step.skill_id}`
      : `name-${step.skill_name || "unknown"}`;

    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        skill_id: step.skill_id || null,
        skill_name: step.skill_name || "Skill",
        frequency: Number(step.frequency || 0),
        steps: []
      });
    }

    groupsMap.get(key).steps.push(step);
  }

  const groups = Array.from(groupsMap.values()).map((group) => {
    const orderedSteps = [...group.steps].sort(
      (a, b) => Number(a.step_order) - Number(b.step_order)
    );

    const status = getSkillGroupStatus(orderedSteps);

    let completed_at = null;

    if (status === "COMPLETED") {
      const completedDates = orderedSteps
        .filter((step) => step.status === "COMPLETED" && step.updated_at)
        .map((step) => new Date(step.updated_at).getTime())
        .filter((value) => Number.isFinite(value));

      if (completedDates.length > 0) {
        completed_at = new Date(Math.max(...completedDates)).toISOString();
      }
    }

    return {
      ...group,
      steps: orderedSteps,
      status,
      completed_at
    };
  });

  groups.sort((a, b) => {
    const weightDiff =
      getSkillGroupSortWeight(a.status) - getSkillGroupSortWeight(b.status);

    if (weightDiff !== 0) return weightDiff;

    const freqDiff = Number(b.frequency || 0) - Number(a.frequency || 0);
    if (freqDiff !== 0) return freqDiff;

    return String(a.skill_name).localeCompare(String(b.skill_name));
  });

  return groups;
}

function buildSkillPreviewFromGroups(skillGroups) {
  return skillGroups.map((group) => ({
    skill_id: group.skill_id,
    skill_name: group.skill_name,
    frequency: group.frequency,
    status: group.status,
    is_completed: group.status === "COMPLETED"
  }));
}

function getNextSkillFromGroups(skillGroups) {
  const nextGroup = skillGroups.find(
    (group) => group.status === "IN_PROGRESS" || group.status === "NOT_STARTED"
  );

  if (!nextGroup) return null;

  return {
    skill_id: nextGroup.skill_id,
    skill_name: nextGroup.skill_name,
    frequency: nextGroup.frequency,
    status: nextGroup.status
  };
}

async function getSkillFrequencyMapForUser(userId) {
  const [rows] = await db.query(
    `
    SELECT
      js.skill_id,
      COUNT(*) AS frequency
    FROM job_skills js
    JOIN jobs j ON j.id = js.job_id
    WHERE j.user_id = ?
    GROUP BY js.skill_id
    `,
    [userId]
  );

  const frequencyMap = new Map();

  for (const row of rows) {
    frequencyMap.set(Number(row.skill_id), Number(row.frequency || 0));
  }

  return frequencyMap;
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

    const [userSkills] = await db.query(
      `SELECT skill_id
       FROM user_skills
       WHERE user_id = ?`,
      [userId]
    );

    const userSkillIds = new Set(userSkills.map((s) => String(s.skill_id)));

    const frequencyMap = await getSkillFrequencyMapForUser(userId);

    const missingSkills = jobSkills
      .filter((skill) => !userSkillIds.has(String(skill.skill_id)))
      .map((skill) => ({
        ...skill,
        frequency: frequencyMap.get(Number(skill.skill_id)) || 0
      }))
      .sort((a, b) => {
        const freqDiff = Number(b.frequency || 0) - Number(a.frequency || 0);
        if (freqDiff !== 0) return freqDiff;
        return String(a.skill_name).localeCompare(String(b.skill_name));
      });

    if (missingSkills.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "Nu există skill-uri lipsă. Nu este nevoie de roadmap."
      });
    }

    const title = `Roadmap pentru ${job.title}`;
    const description = `Plan personalizat de învățare generat pe baza skill-urilor lipsă pentru jobul ${job.title}.`;

    const [roadmapResult] = await db.query(
      `INSERT INTO roadmaps
        (user_id, job_id, title, description, status, progress)
       VALUES (?, ?, ?, ?, 'NOT_STARTED', 0)`,
      [userId, jobId, title, description]
    );

    const roadmapId = roadmapResult.insertId;

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
            step.description
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
 * Listează roadmap-urile userului + preview skilluri + next skill
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [roadmaps] = await db.query(
      `SELECT
         r.*,
         j.title AS job_title,
         j.company,
         j.experience_label,
         j.degree_label,
         j.meets_experience_requirement,
         j.meets_degree_requirement
       FROM roadmaps r
       JOIN jobs j ON r.job_id = j.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );

    if (roadmaps.length === 0) {
      return res.json({
        ok: true,
        roadmaps: []
      });
    }

    const roadmapIds = roadmaps.map((r) => Number(r.id));
    const placeholders = roadmapIds.map(() => "?").join(",");

    const frequencyMap = await getSkillFrequencyMapForUser(userId);

    const [steps] = await db.query(
      `SELECT
         rs.id,
         rs.roadmap_id,
         rs.skill_id,
         rs.step_order,
         rs.title,
         rs.description,
         rs.status,
         s.name AS skill_name
       FROM roadmap_steps rs
       LEFT JOIN skills s ON rs.skill_id = s.id
       WHERE rs.roadmap_id IN (${placeholders})
       ORDER BY rs.roadmap_id ASC, rs.step_order ASC`,
      roadmapIds
    );

    const stepsByRoadmap = new Map();

    for (const step of steps) {
      const roadmapId = Number(step.roadmap_id);

      if (!stepsByRoadmap.has(roadmapId)) {
        stepsByRoadmap.set(roadmapId, []);
      }

      stepsByRoadmap.get(roadmapId).push({
        ...step,
        frequency: frequencyMap.get(Number(step.skill_id)) || 0
      });
    }

    const enrichedRoadmaps = roadmaps.map((roadmap) => {
      const roadmapSteps = stepsByRoadmap.get(Number(roadmap.id)) || [];
      const skillGroups = buildSkillGroupsFromSteps(roadmapSteps);
      const skillPreview = buildSkillPreviewFromGroups(skillGroups);
      const nextSkill = getNextSkillFromGroups(skillGroups);

      return {
        ...roadmap,
        skill_preview: skillPreview,
        next_skill: nextSkill
      };
    });

    return res.json({
      ok: true,
      roadmaps: enrichedRoadmaps
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
 * Returnează roadmap + steps + skill groups ordonate
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
      `SELECT
         r.*,
         j.title AS job_title,
         j.company,
         j.experience_label,
         j.degree_label,
         j.meets_experience_requirement,
         j.meets_degree_requirement
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

    const frequencyMap = await getSkillFrequencyMapForUser(userId);

    const [steps] = await db.query(
      `SELECT
         rs.*,
         s.name AS skill_name
       FROM roadmap_steps rs
       LEFT JOIN skills s ON rs.skill_id = s.id
       WHERE rs.roadmap_id = ?
       ORDER BY rs.step_order ASC`,
      [roadmapId]
    );

    const enrichedSteps = steps.map((step) => ({
      ...step,
      frequency: frequencyMap.get(Number(step.skill_id)) || 0
    }));

    const skillGroups = buildSkillGroupsFromSteps(enrichedSteps);
    const skillPreview = buildSkillPreviewFromGroups(skillGroups);
    const nextSkill = getNextSkillFromGroups(skillGroups);

    return res.json({
      ok: true,
      roadmap: {
        ...roadmaps[0],
        skill_preview: skillPreview,
        next_skill: nextSkill
      },
      steps: enrichedSteps,
      skill_groups: skillGroups
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

    await db.query(
      `UPDATE roadmap_steps
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, stepId]
    );

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

    let skillCompleted = false;
    let completedSkill = null;

    if (skillId) {
      const [sameSkillSteps] = await db.query(
        `SELECT id, step_order, status
         FROM roadmap_steps
         WHERE roadmap_id = ? AND skill_id = ?
         ORDER BY step_order ASC`,
        [roadmapId, skillId]
      );

      const totalSkillSteps = sameSkillSteps.length;
      const completedSkillSteps = sameSkillSteps.filter(
        (r) => r.status === "COMPLETED"
      ).length;

      let newLevel = null;

      if (completedSkillSteps === totalSkillSteps && totalSkillSteps > 0) {
        newLevel = 2;
        skillCompleted = true;
      } else if (completedSkillSteps >= 1) {
        newLevel = 1;
      }

      if (newLevel !== null) {
        const [existingSkill] = await db.query(
          `SELECT skill_id, level
           FROM user_skills
           WHERE user_id = ? AND skill_id = ?`,
          [userId, skillId]
        );

        if (existingSkill.length > 0) {
          const currentLevel = Number(existingSkill[0].level);
          if (newLevel > currentLevel) {
            await db.query(
              `UPDATE user_skills
               SET level = ?, updated_at = CURRENT_TIMESTAMP
               WHERE user_id = ? AND skill_id = ?`,
              [newLevel, userId, skillId]
            );
          }
        }
      }

      if (skillCompleted) {
        completedSkill = {
          skillId: Number(skillId),
          skillName: skillName || "Skill",
          level: 2
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

/**
 * DELETE /api/roadmaps/:id
 * Șterge un roadmap și toți pașii asociați
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const roadmapId = Number(req.params.id);

  if (!Number.isFinite(roadmapId)) {
    return res.status(400).json({
      ok: false,
      message: "ID roadmap invalid."
    });
  }

  try {
    const [rows] = await db.query(
      `SELECT id
       FROM roadmaps
       WHERE id = ? AND user_id = ?`,
      [roadmapId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Roadmap negăsit."
      });
    }

    await db.query(`DELETE FROM roadmap_steps WHERE roadmap_id = ?`, [roadmapId]);
    await db.query(`DELETE FROM roadmaps WHERE id = ?`, [roadmapId]);

    return res.json({
      ok: true,
      message: "Roadmap șters cu succes."
    });
  } catch (error) {
    console.error("Eroare la ștergerea roadmap-ului:", error);
    return res.status(500).json({
      ok: false,
      message: "Eroare la ștergere."
    });
  }
});

module.exports = router;