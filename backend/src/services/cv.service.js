const pdfParse = require("pdf-parse/lib/pdf-parse");
const mammoth = require("mammoth");
const db = require("../config/db");
const { skillMatchesText } = require("../utils/skillAliases");

async function extractTextFromFile(file) {
  if (!file) {
    throw new Error("No file uploaded");
  }

  const mimeType = file.mimetype || "";
  const originalName = (file.originalname || "").toLowerCase();

  if (
    mimeType === "application/pdf" ||
    originalName.endsWith(".pdf")
  ) {
    const result = await pdfParse(file.buffer);
    return result.text || "";
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    originalName.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({
      buffer: file.buffer
    });
    return result.value || "";
  }

  throw new Error("Unsupported file type. Please upload PDF or DOCX.");
}

async function detectSkillsFromText(text) {
  const normalizedText = String(text || "").toLowerCase();

  const [skills] = await db.query(
    "SELECT id, name, category FROM skills ORDER BY name ASC"
  );

  const detectedSkills = skills
    .filter((skill) => skillMatchesText(skill.name, normalizedText))
    .map((skill) => ({
      skillId: Number(skill.id),
      name: skill.name,
      category: skill.category
    }));

  return detectedSkills;
}

async function extractAndDetectSkills(file) {
  const text = await extractTextFromFile(file);
  const detectedSkills = await detectSkillsFromText(text);

  return {
    text,
    detectedSkills
  };
}

module.exports = {
  extractTextFromFile,
  detectSkillsFromText,
  extractAndDetectSkills
};