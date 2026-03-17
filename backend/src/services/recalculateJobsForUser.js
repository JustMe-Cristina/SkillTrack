const db = require("../config/db");

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

  const userSkillIds = new Set(userSkillRows.map((row) => Number(row.skill_id)));

  for (const job of jobs) {
    const [requiredSkills] = await db.query(
      `SELECT skill_id
       FROM job_skills
       WHERE job_id = ?`,
      [job.id]
    );

    const totalSkills = requiredSkills.length;
    let matchedSkills = 0;

    for (const skill of requiredSkills) {
      if (userSkillIds.has(Number(skill.skill_id))) {
        matchedSkills += 1;
      }
    }

    const newScore =
      totalSkills === 0 ? 0 : Math.round((matchedSkills / totalSkills) * 100);

    await db.query(
      `UPDATE jobs
       SET match_score = ?
       WHERE id = ? AND user_id = ?`,
      [newScore, job.id, userId]
    );
  }
}

module.exports = {
  recalculateJobsForUser
};