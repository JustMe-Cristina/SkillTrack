const db = require("../config/db");
const { skillMatchesText } = require("../utils/skillAliases");
const {
  detectWorkMode,
  detectEmploymentType,
  detectLocation,
  detectExperienceRequirement,
  detectEducationRequirement
} = require("../utils/jobDetection");

function normalizeText(text) {
  return String(text || "").trim();
}

function calculateMatchScore(requiredSkills, userSkillIds) {
  if (!requiredSkills.length) {
    return 0;
  }

  const matchedCount = requiredSkills.filter((skill) =>
    userSkillIds.has(Number(skill.id))
  ).length;

  return Math.round((matchedCount / requiredSkills.length) * 100);
}

async function getAllSkills() {
  const [skills] = await db.query(
    `
    SELECT id, name, category
    FROM skills
    ORDER BY name ASC
    `
  );

  return skills;
}

async function getUserSkills(userId) {
  const [rows] = await db.query(
    `
    SELECT
      us.skill_id AS skillId,
      us.level,
      s.name,
      s.category
    FROM user_skills us
    JOIN skills s ON s.id = us.skill_id
    WHERE us.user_id = ?
    ORDER BY s.name ASC
    `,
    [userId]
  );

  return rows;
}

function detectSkillsFromDescription(skills, description) {
  const normalizedDescription = String(description || "").toLowerCase();

  return skills.filter((skill) =>
    skillMatchesText(skill.name, normalizedDescription)
  );
}

function buildMatchesAndGaps(requiredSkills, userSkills) {
  const userSkillIds = new Set(userSkills.map((skill) => Number(skill.skillId)));

  const matches = requiredSkills
    .filter((skill) => userSkillIds.has(Number(skill.id)))
    .map((skill) => ({
      skillId: Number(skill.id),
      skill: skill.name,
      category: skill.category
    }));

  const gaps = requiredSkills
    .filter((skill) => !userSkillIds.has(Number(skill.id)))
    .map((skill) => ({
      skillId: Number(skill.id),
      skill: skill.name,
      category: skill.category
    }));

  return { matches, gaps };
}

async function analyzeJobData({
  userId,
  title,
  company,
  location,
  description
}) {
  const cleanTitle = normalizeText(title);
  const cleanCompany = normalizeText(company);
  const cleanLocationInput = normalizeText(location);
  const cleanDescription = normalizeText(description);

  if (!cleanTitle || !cleanDescription) {
    throw new Error("Title and description are required");
  }

  const [allSkills, userSkills] = await Promise.all([
    getAllSkills(),
    getUserSkills(userId)
  ]);

  const detectedSkills = detectSkillsFromDescription(allSkills, cleanDescription);

  const { matches, gaps } = buildMatchesAndGaps(detectedSkills, userSkills);

  const userSkillIds = new Set(userSkills.map((skill) => Number(skill.skillId)));
  const score = calculateMatchScore(detectedSkills, userSkillIds);

  const detectedWorkMode = detectWorkMode(cleanDescription);
  const detectedEmploymentType = detectEmploymentType(cleanDescription);
  const detectedLocation = cleanLocationInput || detectLocation(cleanDescription);

  const experience = detectExperienceRequirement(cleanDescription);
  const education = detectEducationRequirement(cleanDescription);

  return {
    ok: true,
    title: cleanTitle,
    company: cleanCompany || null,
    location: detectedLocation || null,
    work_mode: detectedWorkMode || null,
    employment_type: detectedEmploymentType || null,

    experience_min: experience.minimum_years,
    experience_label: experience.label,

    degree_level: education.degree_level,
    degree_label: education.degree_label,

    description: cleanDescription,
    score,

    detectedSkills: detectedSkills.map((skill) => ({
      skillId: Number(skill.id),
      skill: skill.name,
      name: skill.name,
      category: skill.category
    })),

    matches,
    gaps
  };
}

module.exports = {
  analyzeJobData
};