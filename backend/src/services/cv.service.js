const pdfParse = require("pdf-parse");
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

    return (result.text || "").trim();
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    originalName.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({
      buffer: file.buffer
    });

    return (result.value || "").trim();
  }

  throw new Error(
    "Unsupported file type. Please upload a PDF or DOCX file."
  );
}

async function detectSkillsFromText(text) {
  const normalizedText = String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedText) {
    return [];
  }

  const [skills] = await db.query(
    `SELECT
       id,
       name,
       category
     FROM skills
     ORDER BY name ASC`
  );

  const detected = [];

  for (const skill of skills) {
    if (skillMatchesText(skill.name, normalizedText)) {
      detected.push({
        skillId: Number(skill.id),
        name: skill.name,
        category: skill.category
      });
    }
  }

  return detected;
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