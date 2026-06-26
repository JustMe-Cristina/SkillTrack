const db = require("../config/db");

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

async function calculateJobMatchScore(connection, userId, jobId) {
  const [jobSkills] = await connection.query(
    `SELECT skill_id
     FROM job_skills
     WHERE job_id = ?`,
    [jobId]
  );

  if (jobSkills.length === 0) {
    return 0;
  }

  const [userSkills] = await connection.query(
    `SELECT skill_id
     FROM user_skills
     WHERE user_id = ?`,
    [userId]
  );

  const userSkillIds = new Set(
    userSkills.map((skill) => Number(skill.skill_id))
  );

  const matchedSkills = jobSkills.filter((skill) =>
    userSkillIds.has(Number(skill.skill_id))
  ).length;

  return Math.round((matchedSkills / jobSkills.length) * 100);
}

async function recalculateJobScoreForUser(userId, jobId) {
  const connection = await db.getConnection();

  try {
    const score = await calculateJobMatchScore(
      connection,
      userId,
      jobId
    );

    await connection.query(
      `UPDATE jobs
       SET match_score = ?
       WHERE id = ? AND user_id = ?`,
      [score, jobId, userId]
    );

    return score;
  } finally {
    connection.release();
  }
}

async function recalculateAllJobScoresForUser(userId) {
  const connection = await db.getConnection();

  try {
    const [jobs] = await connection.query(
      `SELECT id
       FROM jobs
       WHERE user_id = ?`,
      [userId]
    );

    const updatedJobs = [];

    for (const job of jobs) {
      const score = await calculateJobMatchScore(
        connection,
        userId,
        job.id
      );

      await connection.query(
        `UPDATE jobs
         SET match_score = ?
         WHERE id = ? AND user_id = ?`,
        [score, job.id, userId]
      );

      updatedJobs.push({
        jobId: job.id,
        matchScore: toNumber(score)
      });
    }

    return updatedJobs;
  } finally {
    connection.release();
  }
}

async function recalculateJobsForUser(userId) {
  return recalculateAllJobScoresForUser(userId);
}

module.exports = {
  calculateJobMatchScore,
  recalculateJobScoreForUser,
  recalculateAllJobScoresForUser,
  recalculateJobsForUser
};