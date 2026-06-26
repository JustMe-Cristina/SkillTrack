const db = require("../config/db");
const { skillMatchesText } = require("../utils/skillAliases");
const {
  detectWorkMode,
  detectEmploymentType,
  detectLocation,
  detectExperienceRequirement,
  detectEducationRequirement
} = require("../utils/jobDetection");

function normalizeText(value) {
  return String(value || "").trim();
}

function calculateMatchScore(requiredSkills, userSkillIds) {
  if (requiredSkills.length === 0) {
    return 0;
  }

  const matchedCount = requiredSkills.filter((skill) =>
    userSkillIds.has(Number(skill.id))
  ).length;

  return Math.round((matchedCount / requiredSkills.length) * 100);
}

async function getAllSkills() {
  const [skills] = await db.query(
    `SELECT
       id,
       name,
       category
     FROM skills
     ORDER BY name ASC`
  );

  return skills;
}

async function getUserSkills(userId) {
  const [rows] = await db.query(
    `SELECT
       us.skill_id AS skillId,
       us.level,
       s.name,
       s.category
     FROM user_skills us
     JOIN skills s ON s.id = us.skill_id
     WHERE us.user_id = ?
     ORDER BY s.name ASC`,
    [userId]
  );

  return rows;
}

function detectSkillsFromDescription(skills, description) {
  const normalizedDescription = String(description || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  return skills.filter((skill) =>
    skillMatchesText(skill.name, normalizedDescription)
  );
}

function buildMatchesAndGaps(requiredSkills, userSkills) {
  const userSkillIds = new Set(
    userSkills.map((skill) => Number(skill.skillId))
  );

  const matches = [];
  const gaps = [];

  for (const skill of requiredSkills) {
    const item = {
      skillId: Number(skill.id),
      skill: skill.name,
      name: skill.name,
      category: skill.category
    };

    if (userSkillIds.has(Number(skill.id))) {
      matches.push(item);
    } else {
      gaps.push(item);
    }
  }

  return {
    matches,
    gaps
  };
}

function buildExplanation({
  score,
  detectedSkills,
  matches,
  gaps
}) {
  if (detectedSkills.length === 0) {
    return "Nu au fost identificate competențe relevante în descrierea jobului folosind catalogul de competențe disponibil.";
  }

  if (gaps.length === 0) {
    return `Scorul de compatibilitate este ${score}%. Profilul tău acoperă toate cele ${detectedSkills.length} competențe detectate.`;
  }

  return `Scorul de compatibilitate este ${score}%. Ai ${matches.length} din cele ${detectedSkills.length} competențe detectate. Competențele lipsă sunt: ${gaps
    .map((skill) => skill.skill)
    .join(", ")}.`;
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
  const cleanLocation = normalizeText(location);
  const cleanDescription = normalizeText(description);

  if (!cleanTitle || !cleanDescription) {
    throw new Error("Title and description are required.");
  }

  const [allSkills, userSkills] = await Promise.all([
    getAllSkills(),
    getUserSkills(userId)
  ]);

  const detectedSkills = detectSkillsFromDescription(
    allSkills,
    cleanDescription
  );

  const { matches, gaps } = buildMatchesAndGaps(
    detectedSkills,
    userSkills
  );

  const userSkillIds = new Set(
    userSkills.map((skill) => Number(skill.skillId))
  );

  const score = calculateMatchScore(
    detectedSkills,
    userSkillIds
  );

  const workMode = detectWorkMode(cleanDescription);
  const employmentType = detectEmploymentType(cleanDescription);
  const detectedLocation =
    cleanLocation || detectLocation(cleanDescription);

  const experience =
    detectExperienceRequirement(cleanDescription);

  const education =
    detectEducationRequirement(cleanDescription);

  return {
    ok: true,

    title: cleanTitle,
    company: cleanCompany || null,
    location: detectedLocation || null,

    work_mode: workMode || null,
    employment_type: employmentType || null,

    experience_min: experience.minimum_years,
    experience_label: experience.label,

    degree_level: education.degree_level,
    degree_label: education.degree_label,

    description: cleanDescription,

    score,
    matchedCount: matches.length,
    requiredCount: detectedSkills.length,
    gapCount: gaps.length,

    explanation: buildExplanation({
      score,
      detectedSkills,
      matches,
      gaps
    }),

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