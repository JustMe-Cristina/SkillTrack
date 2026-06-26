const fs = require("fs");
const path = require("path");
const db = require("../src/config/db");

const DATASET_FILE =
  process.env.DATASET_FILE || path.join(__dirname, "../data/jobs_seed.json");

const DEMO_USER_ID = Number(
  process.env.DEMO_USER_ID ||
    process.argv.find((a) => a.startsWith("--userId="))?.split("=")[1]
);

if (!Number.isFinite(DEMO_USER_ID) || DEMO_USER_ID <= 0) {
  console.error(
    "❌ Setează DEMO_USER_ID. Exemplu: DEMO_USER_ID=1 node scripts/seedJobsDataset.js"
  );
  process.exit(1);
}

function normalizeSkillName(name) {
  const value = String(name || "").trim();

  const aliases = {
    PowerBI: "Power BI",
    "power bi": "Power BI",
    "power-bi": "Power BI",

    JS: "JavaScript",
    "React.js": "React",
    ReactJS: "React",

    "MS Excel": "Excel",

    "SQL databases": "SQL",
    "SQL Server": "Microsoft SQL Server",
    MSSQL: "Microsoft SQL Server",
    "MS SQL Server": "Microsoft SQL Server",

    Statistics: "Statistical Analysis",

    LLM: "Large Language Models",
    "Generative AI": "Large Language Models",

    CPP: "C++",
    "C plus plus": "C++",
  };

  return aliases[value] || value;
}

function inferCategory(skillName, skillCategoryMap) {
  const normalized = normalizeSkillName(skillName);
  return skillCategoryMap[normalized] || "Other";
}

function experienceFromSeniority(seniority) {
  switch (seniority) {
    case "INTERNSHIP":
      return { min: 0, label: "Internship / practică" };
    case "JUNIOR":
      return { min: 0, label: "0–2 ani experiență" };
    case "MID":
      return { min: 2, label: "2–5 ani experiență" };
    case "SENIOR":
      return { min: 5, label: "5+ ani experiență" };
    default:
      return { min: null, label: null };
  }
}

async function getTableColumns(tableName) {
  const [rows] = await db.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName]
  );

  return new Set(rows.map((r) => r.COLUMN_NAME));
}

async function getUserSkillIds(userId) {
  const [rows] = await db.query(
    `SELECT skill_id FROM user_skills WHERE user_id = ?`,
    [userId]
  );

  return new Set(rows.map((r) => Number(r.skill_id)));
}

function calculateMatchScore(jobSkillIds, userSkillIds) {
  if (!jobSkillIds.length) return 0;

  const matched = jobSkillIds.filter((id) =>
    userSkillIds.has(Number(id))
  ).length;

  return Math.round((matched / jobSkillIds.length) * 100);
}

async function ensureSkill(skillName, category, existingSkillsByName) {
  const normalized = normalizeSkillName(skillName);
  const key = normalized.toLowerCase();

  if (existingSkillsByName.has(key)) {
    return existingSkillsByName.get(key);
  }

  const [result] = await db.query(
    `INSERT INTO skills (name, category, weight) VALUES (?, ?, ?)`,
    [normalized, category || "Other", 1.0]
  );

  const skill = {
    id: result.insertId,
    name: normalized,
    category: category || "Other",
  };

  existingSkillsByName.set(key, skill);
  return skill;
}

async function main() {
  const raw = fs.readFileSync(DATASET_FILE, "utf8");
  const dataset = JSON.parse(raw);

  const jobs = Array.isArray(dataset.jobs) ? dataset.jobs : [];
  const skillCategoryMap = dataset.metadata?.skill_categories || {};

  if (!jobs.length) {
    throw new Error("Datasetul nu conține jobs.");
  }

  const [userRows] = await db.query(
    `SELECT id, email FROM users WHERE id = ?`,
    [DEMO_USER_ID]
  );

  if (userRows.length === 0) {
    throw new Error(
      `Nu există user cu id=${DEMO_USER_ID}. Creează întâi un cont sau schimbă DEMO_USER_ID.`
    );
  }

  const jobsColumns = await getTableColumns("jobs");

  const [skillsRows] = await db.query(
    `SELECT id, name, category FROM skills`
  );

  const existingSkillsByName = new Map(
    skillsRows.map((s) => [String(s.name).toLowerCase(), s])
  );

  const userSkillIds = await getUserSkillIds(DEMO_USER_ID);

  let inserted = 0;
  let skipped = 0;
  let linkedSkills = 0;

  for (const job of jobs) {
    const cleanTitle = String(job.title || "").trim();
    const cleanCompany = String(job.company || "").trim();
    const cleanLocation = String(job.location || "Cluj-Napoca").trim();
    const cleanDescription = String(job.description || "").trim();

    if (!cleanTitle || !cleanDescription) {
      console.warn(
        `⚠️ Job ignorat: title/description lipsă (${job.id || "fără id"})`
      );
      continue;
    }

    const [dupes] = await db.query(
      `SELECT id
       FROM jobs
       WHERE user_id = ? AND title = ? AND company = ? AND location = ?
       LIMIT 1`,
      [DEMO_USER_ID, cleanTitle, cleanCompany || null, cleanLocation]
    );

    if (dupes.length > 0) {
      skipped++;
      continue;
    }

    const jobSkills = [];

    for (const rawSkill of job.skills || []) {
      const skillName = normalizeSkillName(rawSkill);
      const category = inferCategory(skillName, skillCategoryMap);

      const skill = await ensureSkill(
        skillName,
        category,
        existingSkillsByName
      );

      jobSkills.push(skill);
    }

    const jobSkillIds = jobSkills.map((s) => Number(s.id));
    const matchScore = calculateMatchScore(jobSkillIds, userSkillIds);
    const experience = experienceFromSeniority(job.seniority);

    const base = {
      user_id: DEMO_USER_ID,
      title: cleanTitle,
      company: cleanCompany || null,
      location: cleanLocation,
      work_mode: job.work_mode || null,
      employment_type: job.employment_type || null,
      description: cleanDescription,
      match_score: matchScore,
      status: "SALVAT",
      applied_at: null,
      start_period: null,
      experience_min: experience.min,
      experience_label: experience.label,
      degree_level: null,
      degree_label: null,
      meets_experience_requirement: null,
      meets_degree_requirement: null,

      external_dataset_id: job.id || null,
      seniority: job.seniority || null,
      category: job.category || null,
      salary_range: job.salary_range || null,
      technologies_json: JSON.stringify(job.technologies || []),
      posted_at: job.posted_at || null,
      source_type: job.source_type || null,
      source_note: job.source_note || null,
      market_demand: job.market_demand || null,
      difficulty_score: Number(job.difficulty_score) || null,
    };

    const insertableEntries = Object.entries(base).filter(([col]) =>
      jobsColumns.has(col)
    );

    const columns = insertableEntries.map(([col]) => col);
    const values = insertableEntries.map(([, value]) => value);
    const placeholders = columns.map(() => "?").join(", ");

    const [result] = await db.query(
      `INSERT INTO jobs (${columns.join(", ")}) VALUES (${placeholders})`,
      values
    );

    const jobId = result.insertId;
    inserted++;

    for (const skill of jobSkills) {
      await db.query(
        `INSERT IGNORE INTO job_skills
         (job_id, skill_id, required_level, detected_by)
         VALUES (?, ?, ?, ?)`,
        [jobId, Number(skill.id), 1, "DATASET"]
      );

      linkedSkills++;
    }
  }

  console.log("✅ Dataset importat în SkillTrack");
  console.log(`User: ${userRows[0].email || userRows[0].id}`);
  console.log(`Joburi inserate: ${inserted}`);
  console.log(`Joburi sărite ca duplicate: ${skipped}`);
  console.log(`Legături job_skills create/verificate: ${linkedSkills}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed error:", err.message);
  console.error(err);
  process.exit(1);
});