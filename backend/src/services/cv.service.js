const pdfParse = require("pdf-parse/lib/pdf-parse");
const mammoth = require("mammoth");
const db = require("../config/db");
const { skillMatchesText } = require("../utils/skillAliases");

async function extractText(file) {
  const mime = file.mimetype;

  if (mime === "application/pdf") {
    const result = await pdfParse(file.buffer);
    return result.text;
  }

  if (
    mime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }

  throw new Error("Unsupported file type");
}

async function extractSkillsFromCV(file, userId) {
  const text = await extractText(file);

  const [skills] = await db.query("SELECT id, name, category FROM skills");

  const detected = skills.filter((skill) =>
    skillMatchesText(skill.name, text)
  );

  const [userSkills] = await db.query(
    "SELECT skill_id FROM user_skills WHERE user_id = ?",
    [userId]
  );

  const userSkillIds = new Set(userSkills.map((s) => s.skill_id));

  return {
    detectedSkills: detected.map((skill) => ({
      skillId: skill.id,
      name: skill.name,
      category: skill.category,
      isNew: !userSkillIds.has(skill.id),
    })),
  };
}

module.exports = { extractSkillsFromCV };