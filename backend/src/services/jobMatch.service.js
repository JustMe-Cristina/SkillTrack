const db = require("../config/db");

async function recalculateJobsForUser(userId) {
  const [jobs] = await db.execute(
    "SELECT id FROM jobs WHERE user_id = ?",
    [userId]
  );

  if (jobs.length === 0) {
    return;
  }

  const jobIds = jobs.map((job) => job.id);

  const placeholders = jobIds.map(() => "?").join(",");

  const [jobSkills] = await db.execute(
    `
    SELECT js.job_id, s.name
    FROM job_skills js
    JOIN skills s ON js.skill_id = s.id
    WHERE js.job_id IN (${placeholders})
    `,
    jobIds
  );

  const [userSkills] = await db.execute(
    `
    SELECT s.name
    FROM user_skills us
    JOIN skills s ON us.skill_id = s.id
    WHERE us.user_id = ?
    `,
    [userId]
  );

  const userSkillSet = new Set(userSkills.map((skill) => skill.name));
  const jobSkillsMap = {};

  for (const row of jobSkills) {
    if (!jobSkillsMap[row.job_id]) {
      jobSkillsMap[row.job_id] = [];
    }

    jobSkillsMap[row.job_id].push(row.name);
  }

  for (const jobId of jobIds) {
    const requiredSkills = jobSkillsMap[jobId] || [];

    if (requiredSkills.length === 0) {
      await db.execute(
        "UPDATE jobs SET match_score = 0 WHERE id = ?",
        [jobId]
      );
      continue;
    }

    const matchedCount = requiredSkills.filter((skillName) =>
      userSkillSet.has(skillName)
    ).length;

    const score = Math.round((matchedCount / requiredSkills.length) * 100);

    await db.execute(
      "UPDATE jobs SET match_score = ? WHERE id = ?",
      [score, jobId]
    );
  }
}

module.exports = {
  recalculateJobsForUser
};