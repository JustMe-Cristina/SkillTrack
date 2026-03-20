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
  if (score < 40) {
    return "Ești la început — fiecare skill adăugat contează.";
  }

  if (score <= 70) {
    return "Ești în zona de creștere — provocarea depășește ușor nivelul actual. Aceasta este condiția exactă pentru progres real.";
  }

  return "Ești competitiv — joburile tale țintă sunt la îndemână.";
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
      count: Number(row.count)
    }));

    const streak = calculateStreak(activity);
    const totalActions = activity.reduce((sum, day) => sum + day.count, 0);
    const activeDays = activity.length;

    return res.json({
      ok: true,
      activity,
      streak,
      totalActions,
      activeDays
    });
  } catch (err) {
    console.error("GET ACTIVITY ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error"
    });
  }
});

router.get("/dashboard", auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [[userRow]] = await db.query(
      `SELECT name
       FROM users
       WHERE id = ?`,
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

    const activity = activityRows.map((row) => ({
      date: formatDateLocal(row.date),
      count: Number(row.count)
    }));

    const streak = calculateStreak(activity);
    const totalActions = activity.reduce((sum, day) => sum + day.count, 0);
    const activeDays = activity.length;

    const avgScore =
      jobs.length === 0
        ? 0
        : Math.round(
            jobs.reduce((sum, job) => sum + (Number(job.match_score) || 0), 0) / jobs.length
          );

    const bestJob =
      jobs.length === 0
        ? null
        : [...jobs].sort(
            (a, b) => (Number(b.match_score) || 0) - (Number(a.match_score) || 0)
          )[0];

    return res.json({
      ok: true,
      user: {
        name: userRow?.name || "Cristina"
      },
      avgScore,
      motivationalMessage: buildMotivationalMessage(avgScore),
      streak,
      totalActions,
      activeDays,
      activity,
      bestJob: bestJob
        ? {
            id: bestJob.id,
            title: bestJob.title,
            company: bestJob.company,
            score: Number(bestJob.match_score) || 0
          }
        : null
    });
  } catch (err) {
    console.error("GET DASHBOARD ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error"
    });
  }
});

module.exports = router;