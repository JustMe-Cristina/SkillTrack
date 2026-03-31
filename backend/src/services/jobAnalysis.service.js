const db = require("../config/db");
const { skillMatchesText } = require("../utils/skillAliases");
const {
  detectWorkMode,
  detectEmploymentType,
  detectLocation
} = require("../utils/jobDetection");

async function analyzeJobData({
  userId,
  title,
  company,
  location,
  work_mode,
  employment_type,
  description
}) {
  const text = String(description || "").toLowerCase();

  const [skills] = await db.query(
    "SELECT id, name, category FROM skills ORDER BY name ASC"
  );

  const detected = skills.filter((skill) =>
    skillMatchesText(skill.name, text)
  );

  const detectedIds = detected.map((s) => Number(s.id));
  const userSkillIds = new Set();

  if (detectedIds.length > 0) {
    const placeholders = detectedIds.map(() => "?").join(",");

    const [userSkillRows] = await db.query(
      `SELECT skill_id
       FROM user_skills
       WHERE user_id = ? AND skill_id IN (${placeholders})`,
      [userId, ...detectedIds]
    );

    for (const row of userSkillRows) {
      userSkillIds.add(Number(row.skill_id));
    }
  }

  const matches = [];
  const gaps = [];
  const detectedSkills = [];

  for (const skill of detected) {
    const hasSkill = userSkillIds.has(Number(skill.id));

    detectedSkills.push({
      skillId: Number(skill.id),
      name: skill.name,
      category: skill.category
    });

    if (hasSkill) {
      matches.push({
        skill: skill.name,
        skillId: Number(skill.id)
      });
    } else {
      gaps.push({
        skill: skill.name,
        skillId: Number(skill.id)
      });
    }
  }

  const totalSkills = detected.length;
  const matchedSkills = matches.length;

  const score =
    totalSkills === 0 ? 0 : Math.round((matchedSkills / totalSkills) * 100);

  const detectedLocation =
    location && String(location).trim()
      ? String(location).trim()
      : detectLocation(description);

  const detectedWorkMode =
    work_mode && String(work_mode).trim()
      ? work_mode
      : detectWorkMode(description);

  const detectedEmploymentType =
    employment_type && String(employment_type).trim()
      ? employment_type
      : detectEmploymentType(description);

  return {
    title,
    company,
    location: detectedLocation,
    work_mode: detectedWorkMode,
    employment_type: detectedEmploymentType,
    description,
    detectedSkills,
    score,
    matches,
    gaps
  };
}

module.exports = {
  analyzeJobData
};