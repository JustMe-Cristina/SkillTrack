const express = require("express");
const db = require("../config/db");
const auth = require("../middleware/auth.middleware");

const router = express.Router();

function formatDateLocal(dateValue) {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calculateStreak(activityRows) {
  const activeDays = new Set(activityRows.map((row) => row.date));
  let streak = 0;

  const current = new Date();
  current.setHours(0, 0, 0, 0);

  while (true) {
    const key = formatDateLocal(current);

    if (activeDays.has(key)) {
      streak += 1;
      current.setDate(current.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function buildMotivationalMessage(score) {
  if (score < 40) return "Ești la început — fiecare skill adăugat contează.";

  if (score <= 70) {
    return "Ești în zona de creștere — provocarea depășește ușor nivelul actual. Aceasta este condiția exactă pentru progres real.";
  }

  return "Ești competitiv — joburile tale țintă sunt la îndemână.";
}

function calculateScore(userSkillIds, jobSkills) {
  const total = jobSkills.length;
  if (total === 0) return 0;

  const matched = jobSkills.filter((skill) =>
    userSkillIds.has(Number(skill.skill_id))
  ).length;

  return Math.round((matched / total) * 100);
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

router.get("/activity", auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [rows] = await db.query(
      `SELECT
         DATE(created_at) AS date,
         COUNT(*) AS count
       FROM activity_log
       WHERE user_id = ?
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) ASC`,
      [userId]
    );

    const activity = rows.map((row) => ({
      date: formatDateLocal(row.date),
      count: toNumber(row.count)
    }));

    return res.json({
      ok: true,
      activity,
      streak: calculateStreak(activity),
      totalActions: activity.reduce((sum, day) => sum + day.count, 0),
      activeDays: activity.length
    });
  } catch (err) {
    console.error("GET ACTIVITY ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.get("/dashboard", auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [[userRow]] = await db.query(
      `SELECT name FROM users WHERE id = ?`,
      [userId]
    );

    const [jobs] = await db.query(
      `SELECT id, title, company, match_score
       FROM jobs
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    const [activityRows] = await db.query(
      `SELECT
         DATE(created_at) AS date,
         COUNT(*) AS count
       FROM activity_log
       WHERE user_id = ?
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) ASC`,
      [userId]
    );

    const [activityDetails] = await db.query(
      `SELECT
         DATE(created_at) AS date,
         action_type,
         COUNT(*) AS count
       FROM activity_log
       WHERE user_id = ?
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)
       GROUP BY DATE(created_at), action_type
       ORDER BY DATE(created_at) ASC`,
      [userId]
    );

    const detailsMap = {};

    for (const row of activityDetails) {
      const dateKey = formatDateLocal(row.date);

      if (!detailsMap[dateKey]) {
        detailsMap[dateKey] = [];
      }

      detailsMap[dateKey].push({
        type: row.action_type,
        count: toNumber(row.count)
      });
    }

    const activity = activityRows.map((row) => {
      const dateKey = formatDateLocal(row.date);

      return {
        date: dateKey,
        count: toNumber(row.count),
        details: detailsMap[dateKey] || []
      };
    });

    const avgScore =
      jobs.length === 0
        ? 0
        : Math.round(
            jobs.reduce((sum, job) => sum + toNumber(job.match_score), 0) /
              jobs.length
          );

    const bestJob =
      jobs.length === 0
        ? null
        : [...jobs].sort(
            (a, b) => toNumber(b.match_score) - toNumber(a.match_score)
          )[0];

    const [[skillCountRow]] = await db.query(
      `SELECT COUNT(*) AS cnt FROM user_skills WHERE user_id = ?`,
      [userId]
    );

    return res.json({
      ok: true,
      user: { name: userRow?.name || "Utilizator" },
      avgScore,
      motivationalMessage: buildMotivationalMessage(avgScore),
      streak: calculateStreak(activity),
      activeDays: activity.length,
      activity,
      skillCount: toNumber(skillCountRow?.cnt),
      totalJobs: jobs.length,
      bestJob: bestJob
        ? {
            id: bestJob.id,
            title: bestJob.title,
            company: bestJob.company,
            score: toNumber(bestJob.match_score)
          }
        : null
    });
  } catch (err) {
    console.error("GET DASHBOARD ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.get("/overview", auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [[jobStats]] = await db.query(
      `SELECT
         COUNT(*) AS totalJobs,
         ROUND(AVG(match_score)) AS avgMatchScore,
         MAX(match_score) AS maxMatchScore,
         MIN(match_score) AS minMatchScore,
         COUNT(DISTINCT category) AS totalCategories
       FROM jobs
       WHERE user_id = ?`,
      [userId]
    );

    const [[skillStats]] = await db.query(
      `SELECT COUNT(DISTINCT js.skill_id) AS totalRequiredSkills
       FROM job_skills js
       JOIN jobs j ON j.id = js.job_id
       WHERE j.user_id = ?`,
      [userId]
    );

    const [[bestJob]] = await db.query(
      `SELECT id, title, company, match_score
       FROM jobs
       WHERE user_id = ?
       ORDER BY match_score DESC
       LIMIT 1`,
      [userId]
    );

    const [[weakestJob]] = await db.query(
      `SELECT id, title, company, match_score
       FROM jobs
       WHERE user_id = ?
       ORDER BY match_score ASC
       LIMIT 1`,
      [userId]
    );

    return res.json({
      ok: true,
      overview: {
        totalJobs: toNumber(jobStats?.totalJobs),
        avgMatchScore: toNumber(jobStats?.avgMatchScore),
        maxMatchScore: toNumber(jobStats?.maxMatchScore),
        minMatchScore: toNumber(jobStats?.minMatchScore),
        totalCategories: toNumber(jobStats?.totalCategories),
        totalRequiredSkills: toNumber(skillStats?.totalRequiredSkills),
        bestJob: bestJob || null,
        weakestJob: weakestJob || null
      }
    });
  } catch (err) {
    console.error("ANALYTICS OVERVIEW ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.get("/job-categories", auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [rows] = await db.query(
      `SELECT
         category,
         COUNT(*) AS total,
         ROUND(AVG(match_score)) AS avgMatchScore
       FROM jobs
       WHERE user_id = ?
         AND category IS NOT NULL
       GROUP BY category
       ORDER BY total DESC`,
      [userId]
    );

    return res.json({
      ok: true,
      categories: rows.map((row) => ({
        category: row.category,
        total: toNumber(row.total),
        avgMatchScore: toNumber(row.avgMatchScore)
      }))
    });
  } catch (err) {
    console.error("JOB CATEGORIES ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.get("/work-modes", auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [rows] = await db.query(
      `SELECT
         work_mode,
         COUNT(*) AS total,
         ROUND(AVG(match_score)) AS avgMatchScore
       FROM jobs
       WHERE user_id = ?
         AND work_mode IS NOT NULL
       GROUP BY work_mode
       ORDER BY total DESC`,
      [userId]
    );

    return res.json({
      ok: true,
      workModes: rows.map((row) => ({
        workMode: row.work_mode,
        total: toNumber(row.total),
        avgMatchScore: toNumber(row.avgMatchScore)
      }))
    });
  } catch (err) {
    console.error("WORK MODES ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.get("/seniority", auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [rows] = await db.query(
      `SELECT
         seniority,
         COUNT(*) AS total,
         ROUND(AVG(match_score)) AS avgMatchScore
       FROM jobs
       WHERE user_id = ?
         AND seniority IS NOT NULL
       GROUP BY seniority
       ORDER BY
         CASE seniority
           WHEN 'INTERNSHIP' THEN 1
           WHEN 'JUNIOR' THEN 2
           WHEN 'MID' THEN 3
           WHEN 'SENIOR' THEN 4
           ELSE 5
         END`,
      [userId]
    );

    return res.json({
      ok: true,
      seniority: rows.map((row) => ({
        seniority: row.seniority,
        total: toNumber(row.total),
        avgMatchScore: toNumber(row.avgMatchScore)
      }))
    });
  } catch (err) {
    console.error("SENIORITY ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.get("/top-skills", auth, async (req, res) => {
  const userId = req.user.userId;
  const rawLimit = Number(req.query.limit);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), 50)
    : 15;

  try {
    const [rows] = await db.query(
      `SELECT
         s.id,
         s.name,
         s.category,
         COUNT(*) AS demandCount
       FROM job_skills js
       JOIN skills s ON s.id = js.skill_id
       JOIN jobs j ON j.id = js.job_id
       WHERE j.user_id = ?
       GROUP BY s.id, s.name, s.category
       ORDER BY demandCount DESC, s.name ASC
       LIMIT ?`,
      [userId, limit]
    );

    return res.json({
      ok: true,
      topSkills: rows.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        demandCount: toNumber(row.demandCount)
      }))
    });
  } catch (err) {
    console.error("TOP SKILLS ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.get("/difficulty", auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [[stats]] = await db.query(
      `SELECT
         ROUND(AVG(difficulty_score)) AS avgDifficulty,
         MIN(difficulty_score) AS minDifficulty,
         MAX(difficulty_score) AS maxDifficulty
       FROM jobs
       WHERE user_id = ?
         AND difficulty_score IS NOT NULL`,
      [userId]
    );

    const [distribution] = await db.query(
      `SELECT
         CASE
           WHEN difficulty_score < 40 THEN 'LOW'
           WHEN difficulty_score BETWEEN 40 AND 70 THEN 'MEDIUM'
           ELSE 'HIGH'
         END AS difficultyLevel,
         COUNT(*) AS total
       FROM jobs
       WHERE user_id = ?
         AND difficulty_score IS NOT NULL
       GROUP BY difficultyLevel
       ORDER BY
         CASE difficultyLevel
           WHEN 'LOW' THEN 1
           WHEN 'MEDIUM' THEN 2
           WHEN 'HIGH' THEN 3
           ELSE 4
         END`,
      [userId]
    );

    return res.json({
      ok: true,
      difficulty: {
        avgDifficulty: toNumber(stats?.avgDifficulty),
        minDifficulty: toNumber(stats?.minDifficulty),
        maxDifficulty: toNumber(stats?.maxDifficulty),
        distribution: distribution.map((row) => ({
          level: row.difficultyLevel,
          total: toNumber(row.total)
        }))
      }
    });
  } catch (err) {
    console.error("DIFFICULTY ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.get("/insights", auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [[overview]] = await db.query(
      `SELECT
         COUNT(*) AS totalJobs,
         ROUND(AVG(match_score)) AS avgMatchScore
       FROM jobs
       WHERE user_id = ?`,
      [userId]
    );

    const [[topCategory]] = await db.query(
      `SELECT category, COUNT(*) AS total
       FROM jobs
       WHERE user_id = ?
         AND category IS NOT NULL
       GROUP BY category
       ORDER BY total DESC
       LIMIT 1`,
      [userId]
    );

    const [[topWorkMode]] = await db.query(
      `SELECT work_mode, COUNT(*) AS total
       FROM jobs
       WHERE user_id = ?
         AND work_mode IS NOT NULL
       GROUP BY work_mode
       ORDER BY total DESC
       LIMIT 1`,
      [userId]
    );

    const [[topSkill]] = await db.query(
      `SELECT s.name, COUNT(*) AS demandCount
       FROM job_skills js
       JOIN skills s ON s.id = js.skill_id
       JOIN jobs j ON j.id = js.job_id
       WHERE j.user_id = ?
       GROUP BY s.id, s.name
       ORDER BY demandCount DESC
       LIMIT 1`,
      [userId]
    );

    const [[bestJob]] = await db.query(
      `SELECT title, company, match_score
       FROM jobs
       WHERE user_id = ?
       ORDER BY match_score DESC
       LIMIT 1`,
      [userId]
    );

    const insights = [];

    if (toNumber(overview?.totalJobs) > 0) {
      insights.push({
        type: "SUMMARY",
        title: "Portofoliu de joburi analizat",
        message: `Ai ${overview.totalJobs} joburi în portofoliu, cu un scor mediu de compatibilitate de ${overview.avgMatchScore || 0}%.`
      });
    }

    if (topCategory) {
      insights.push({
        type: "CATEGORY",
        title: "Categoria dominantă",
        message: `Cele mai multe joburi analizate sunt din categoria ${topCategory.category}, cu ${topCategory.total} apariții.`
      });
    }

    if (topWorkMode) {
      insights.push({
        type: "WORK_MODE",
        title: "Mod de lucru dominant",
        message: `Modelul ${topWorkMode.work_mode} apare cel mai des în datasetul tău, în ${topWorkMode.total} joburi.`
      });
    }

    if (topSkill) {
      insights.push({
        type: "SKILL_DEMAND",
        title: "Cel mai cerut skill",
        message: `${topSkill.name} este cel mai frecvent skill cerut, apărând în ${topSkill.demandCount} joburi.`
      });
    }

    if (bestJob) {
      insights.push({
        type: "BEST_MATCH",
        title: "Cel mai bun match",
        message: `Cel mai potrivit job pentru profilul tău este ${bestJob.title} la ${bestJob.company}, cu scor de ${bestJob.match_score}%.`
      });
    }

    return res.json({ ok: true, insights });
  } catch (err) {
    console.error("INSIGHTS ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.get("/shap/:jobId", auth, async (req, res) => {
  const userId = req.user.userId;
  const jobId = Number(req.params.jobId);

  if (!Number.isFinite(jobId)) {
    return res.status(400).json({ ok: false, error: "Invalid job id" });
  }

  try {
    const [[job]] = await db.query(
      `SELECT id, title, company, match_score
       FROM jobs
       WHERE id = ? AND user_id = ?`,
      [jobId, userId]
    );

    if (!job) {
      return res.status(404).json({ ok: false, error: "Job negăsit" });
    }

    const [jobSkills] = await db.query(
      `SELECT s.id AS skill_id, s.name, s.category
       FROM job_skills js
       JOIN skills s ON s.id = js.skill_id
       WHERE js.job_id = ?`,
      [jobId]
    );

    if (jobSkills.length === 0) {
      return res.json({
        ok: true,
        jobId,
        jobTitle: job.title,
        baseScore: 0,
        explanations: [],
        message: "Jobul nu are skilluri asociate. Analizează-l din nou."
      });
    }

    const [userSkillRows] = await db.query(
      `SELECT skill_id FROM user_skills WHERE user_id = ?`,
      [userId]
    );

    const userSkillIds = new Set(userSkillRows.map((row) => Number(row.skill_id)));
    const baseScore = calculateScore(userSkillIds, jobSkills);
    const gaps = jobSkills.filter(
      (skill) => !userSkillIds.has(Number(skill.skill_id))
    );

    if (gaps.length === 0) {
      return res.json({
        ok: true,
        jobId,
        jobTitle: job.title,
        baseScore,
        explanations: [],
        message: "Profilul tău acoperă complet cerințele acestui job."
      });
    }

    const explanations = gaps.map((skill) => {
      const simulatedIds = new Set([...userSkillIds, Number(skill.skill_id)]);
      const scoreWith = calculateScore(simulatedIds, jobSkills);
      const shapValue = scoreWith - baseScore;

      return {
        skillId: skill.skill_id,
        skill: skill.name,
        category: skill.category,
        shapValue,
        scoreWith
      };
    });

    explanations.sort(
      (a, b) => b.shapValue - a.shapValue || a.skill.localeCompare(b.skill)
    );

    return res.json({
      ok: true,
      jobId,
      jobTitle: job.title,
      baseScore,
      explanations
    });
  } catch (err) {
    console.error("SHAP ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.get("/market", auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [jobs] = await db.query(
      `SELECT id, title, company, match_score
       FROM jobs
       WHERE user_id = ?`,
      [userId]
    );

    if (jobs.length === 0) {
      return res.json({
        ok: true,
        totalJobs: 0,
        avgScore: 0,
        distribution: { high: 0, medium: 0, low: 0 },
        skillsImpact: [],
        bestNextSkill: null,
        message: "Nu ai joburi salvate încă."
      });
    }

    const [userSkillRows] = await db.query(
      `SELECT skill_id FROM user_skills WHERE user_id = ?`,
      [userId]
    );

    const userSkillIds = new Set(userSkillRows.map((row) => Number(row.skill_id)));

    const jobIds = jobs.map((job) => job.id);
    const placeholders = jobIds.map(() => "?").join(",");

    const [allJobSkills] = await db.query(
      `SELECT js.job_id, s.id AS skill_id, s.name, s.category
       FROM job_skills js
       JOIN skills s ON s.id = js.skill_id
       WHERE js.job_id IN (${placeholders})`,
      jobIds
    );

    const skillsByJob = {};

    for (const row of allJobSkills) {
      if (!skillsByJob[row.job_id]) {
        skillsByJob[row.job_id] = [];
      }

      skillsByJob[row.job_id].push(row);
    }

    const avgScore = Math.round(
      jobs.reduce((sum, job) => sum + toNumber(job.match_score), 0) /
        jobs.length
    );

    const distribution = { high: 0, medium: 0, low: 0 };

    for (const job of jobs) {
      const score = toNumber(job.match_score);

      if (score > 70) distribution.high += 1;
      else if (score >= 40) distribution.medium += 1;
      else distribution.low += 1;
    }

    const skillImpactMap = new Map();

    for (const job of jobs) {
      const jobSkills = skillsByJob[job.id] || [];
      const currentScore = calculateScore(userSkillIds, jobSkills);
      const gaps = jobSkills.filter(
        (skill) => !userSkillIds.has(Number(skill.skill_id))
      );

      for (const skill of gaps) {
        const simulatedIds = new Set([...userSkillIds, Number(skill.skill_id)]);
        const scoreWith = calculateScore(simulatedIds, jobSkills);
        const gain = scoreWith - currentScore;

        if (gain > 0) {
          if (!skillImpactMap.has(skill.skill_id)) {
            skillImpactMap.set(skill.skill_id, {
              skillId: skill.skill_id,
              name: skill.name,
              category: skill.category,
              totalGain: 0,
              jobsAffected: new Set()
            });
          }

          const entry = skillImpactMap.get(skill.skill_id);
          entry.totalGain += gain;
          entry.jobsAffected.add(job.id);
        }
      }
    }

    const skillsImpact = Array.from(skillImpactMap.values())
      .map((skill) => ({
        skillId: skill.skillId,
        name: skill.name,
        category: skill.category,
        jobsAffected: skill.jobsAffected.size,
        avgGain: Math.round(skill.totalGain / skill.jobsAffected.size)
      }))
      .sort(
        (a, b) =>
          b.avgGain - a.avgGain ||
          b.jobsAffected - a.jobsAffected ||
          a.name.localeCompare(b.name)
      );

    return res.json({
      ok: true,
      totalJobs: jobs.length,
      avgScore,
      distribution,
      skillsImpact,
      bestNextSkill: skillsImpact.length > 0 ? skillsImpact[0] : null
    });
  } catch (err) {
    console.error("MARKET ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.get("/profile-vs-market", auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [allSkills] = await db.query(
      `SELECT id, name, category
       FROM skills
       ORDER BY category, name`
    );

    const [userSkillRows] = await db.query(
      `SELECT skill_id FROM user_skills WHERE user_id = ?`,
      [userId]
    );

    const userSkillIds = new Set(userSkillRows.map((row) => Number(row.skill_id)));

    const [jobs] = await db.query(
      `SELECT id FROM jobs WHERE user_id = ?`,
      [userId]
    );

    if (jobs.length === 0) {
      return res.json({
        ok: true,
        categories: [],
        topGapCategory: null,
        insight: "Nu ai joburi salvate. Adaugă joburi pentru a vedea comparația.",
        totalJobs: 0
      });
    }

    const jobIds = jobs.map((job) => job.id);
    const placeholders = jobIds.map(() => "?").join(",");

    const [jobSkillRows] = await db.query(
      `SELECT DISTINCT skill_id
       FROM job_skills
       WHERE job_id IN (${placeholders})`,
      jobIds
    );

    const marketSkillIds = new Set(
      jobSkillRows.map((row) => Number(row.skill_id))
    );

    const categoriesMap = {};

    for (const skill of allSkills) {
      const category = skill.category || "Other";

      if (!categoriesMap[category]) {
        categoriesMap[category] = {
          category,
          totalSkills: 0,
          userHas: 0,
          marketNeeds: 0,
          skills: []
        };
      }

      const cat = categoriesMap[category];

      cat.totalSkills += 1;

      const hasUser = userSkillIds.has(Number(skill.id));
      const hasMarket = marketSkillIds.has(Number(skill.id));

      if (hasUser) cat.userHas += 1;
      if (hasMarket) cat.marketNeeds += 1;

      if (hasUser || hasMarket) {
        cat.skills.push({
          id: skill.id,
          name: skill.name,
          userHas: hasUser,
          marketNeeds: hasMarket
        });
      }
    }

    const categories = Object.values(categoriesMap)
      .filter((cat) => cat.marketNeeds > 0)
      .map((cat) => {
        const coveredRequired = cat.skills.filter(
          (skill) => skill.userHas && skill.marketNeeds
        ).length;

        const missingSkills = cat.skills
          .filter((skill) => !skill.userHas && skill.marketNeeds)
          .map((skill) => skill.name);

        const extraSkills = cat.skills
          .filter((skill) => skill.userHas && !skill.marketNeeds)
          .map((skill) => skill.name);

        const coveragePercent =
          cat.marketNeeds === 0
            ? 100
            : Math.round((coveredRequired / cat.marketNeeds) * 100);

        const skillsSorted = cat.skills.sort((a, b) => {
          if (!a.userHas && a.marketNeeds && (b.userHas || !b.marketNeeds)) {
            return -1;
          }

          if (!b.userHas && b.marketNeeds && (a.userHas || !a.marketNeeds)) {
            return 1;
          }

          if (a.userHas && a.marketNeeds && !b.marketNeeds) {
            return -1;
          }

          if (b.userHas && b.marketNeeds && !a.marketNeeds) {
            return 1;
          }

          return a.name.localeCompare(b.name);
        });

        return {
          category: cat.category,
          coveredRequired,
          marketNeeds: cat.marketNeeds,
          coveragePercent,
          missingSkills,
          extraSkills,
          userHas: cat.userHas,
          skills: skillsSorted
        };
      })
      .sort(
        (a, b) =>
          a.coveragePercent - b.coveragePercent ||
          b.marketNeeds - a.marketNeeds
      );

    const allMissingSkills = categories.flatMap((category) => category.missingSkills);
    const allExtraSkills = categories.flatMap((category) => category.extraSkills);

    let insight = null;

    if (allMissingSkills.length === 0) {
      insight = "Ai toate skillurile cerute de joburile salvate.";
    } else if (allMissingSkills.length <= 3) {
      insight = `Îți lipsesc ${allMissingSkills.length} skilluri cerute: ${allMissingSkills.join(
        ", "
      )}.`;

      if (allExtraSkills.length > 0) {
        insight += ` Ai în plus: ${allExtraSkills.slice(0, 3).join(", ")}${
          allExtraSkills.length > 3 ? " și altele" : ""
        }.`;
      }
    } else {
      insight = `Îți lipsesc ${allMissingSkills.length} skilluri cerute. Prioritare: ${allMissingSkills
        .slice(0, 3)
        .join(", ")}.`;

      if (allExtraSkills.length > 0) {
        insight += ` Ai în plus față de cerințe: ${allExtraSkills
          .slice(0, 2)
          .join(", ")} și altele.`;
      }
    }

    return res.json({
      ok: true,
      categories,
      insight,
      totalJobs: jobs.length
    });
  } catch (err) {
    console.error("PROFILE VS MARKET ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;