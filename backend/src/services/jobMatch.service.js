const db = require("../config/db");

const ALLOWED_MATCH_CATEGORIES = ["Data", "BI", "Tools", "DevOps", "Business"];

function isMatchCategory(category) {
  return ALLOWED_MATCH_CATEGORIES.includes(category);
}

async function recalculateJobsForUser(userId) {
  const [jobs] = await db.query(
    `SELECT id
     FROM jobs
     WHERE user_id = ?`,
    [userId]
  );

  if (jobs.length === 0) {
    return;
  }

  const [userSkillRows] = await db.query(
    `SELECT skill_id
     FROM user_skills
     WHERE user_id = ?`,
    [userId]
  );

  const userSkillIds = new Set(userSkillRows.map((row) => row.skill_id));

  for (const job of jobs) {
    const jobId = job.id;

    const [requiredSkills] = await db.query(
      `SELECT s.id AS skill_id, s.category
       FROM job_skills js
       JOIN skills s ON s.id = js.skill_id
       WHERE js.job_id = ?`,
      [jobId]
    );

    const filteredRequiredSkills = requiredSkills.filter((skill) =>
      isMatchCategory(skill.category)
    );

    const totalSkills = filteredRequiredSkills.length;

    let matchedSkills = 0;

    for (const skill of filteredRequiredSkills) {
      if (userSkillIds.has(skill.skill_id)) {
        matchedSkills += 1;
      }
    }

    const newScore =
      totalSkills === 0 ? 0 : Math.round((matchedSkills / totalSkills) * 100);

    await db.query(
      `UPDATE jobs
       SET match_score = ?
       WHERE id = ? AND user_id = ?`,
      [newScore, jobId, userId]
    );
  }
}

module.exports = {
  recalculateJobsForUser
};