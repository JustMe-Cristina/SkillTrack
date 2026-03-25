const express = require("express");
const db = require("../config/db");
const auth = require("../middleware/auth.middleware");

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// FUNCȚII UTILITARE
// Folosite de mai multe endpoint-uri, definite o singură dată aici sus
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convertește un obiect Date sau string în format "YYYY-MM-DD".
 * MySQL returnează date ca obiecte Date — avem nevoie de string
 * pentru a le compara și afișa corect în frontend.
 */
function formatDateLocal(dateValue) {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculează streak-ul curent (zile consecutive de activitate).
 *
 * Logica: pornind de azi, mergem înapoi zi cu zi.
 * Cât timp ziua respectivă e în setul zilelor active, incrementăm streak-ul.
 * Prima zi inactivă oprește numărătoarea.
 *
 * Exemplu:
 *   Azi = activ, ieri = activ, alaltăieri = inactiv → streak = 2
 */
function calculateStreak(activityRows) {
  // Construim un Set cu toate datele active (ex: "2025-03-19")
  const activeDays = new Set(activityRows.map((row) => row.date));
  let streak = 0;

  // Pornim de la ziua de azi la miezul nopții
  const current = new Date();
  current.setHours(0, 0, 0, 0);

  while (true) {
    const key = formatDateLocal(current);

    if (activeDays.has(key)) {
      streak += 1;
      // Mergem cu o zi înapoi
      current.setDate(current.getDate() - 1);
    } else {
      // Ziua asta nu e activă — streak-ul s-a oprit
      break;
    }
  }

  return streak;
}

/**
 * Generează un mesaj motivațional bazat pe scorul mediu.
 *
 * Logica e bazată pe Flow Theory (Csikszentmihalyi, 1990):
 * - Sub 40%: utilizatorul e la început, orice progres contează
 * - 40-70%: zona de flow — dificultatea depășește ușor nivelul actual,
 *            condiție optimă pentru învățare
 * - Peste 70%: utilizatorul e competitiv, aproape de obiectiv
 */
function buildMotivationalMessage(score) {
  if (score < 40) {
    return "Ești la început — fiecare skill adăugat contează.";
  }

  if (score <= 70) {
    return "Ești în zona de creștere — provocarea depășește ușor nivelul actual. Aceasta este condiția exactă pentru progres real.";
  }

  return "Ești competitiv — joburile tale țintă sunt la îndemână.";
}

/**
 * Calculează scorul de potrivire dintre un set de skills ale userului
 * și lista de skills cerute de un job.
 *
 * Formula: skills_acoperite / total_skills_job * 100
 *
 * Parametri:
 *   userSkillIds — Set cu ID-urile skills pe care userul le are
 *   jobSkills    — array de obiecte { skill_id, name, ... } cerute de job
 *
 * Folosit în SHAP pentru a simula scoruri cu/fără un skill anume.
 */
function calculateScore(userSkillIds, jobSkills) {
  const total = jobSkills.length;
  if (total === 0) return 0;

  const matched = jobSkills.filter((s) => userSkillIds.has(s.skill_id)).length;
  return Math.round((matched / total) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/activity
//
// Returnează datele pentru heatmap-ul de activitate (stil GitHub)
// și calculele pentru streak.
//
// Ce face:
//   1. Ia din activity_log toate acțiunile userului din ultimul an
//   2. Le grupează pe zile (câte acțiuni per zi)
//   3. Calculează streak-ul curent
//   4. Returnează totul pentru frontend
//
// Folosit în: PanouPrincipal.jsx (heatmap + streak)
// ─────────────────────────────────────────────────────────────────────────────

router.get("/activity", auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    // Luăm toate acțiunile din ultimele 365 zile, grupate pe dată
    const [rows] = await db.query(
      `SELECT
         DATE(created_at) AS date,
         COUNT(*) AS count
       FROM activity_log
       WHERE user_id = ?
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) ASC`,
      [userId]
    );

    // Convertim datele în format consistent pentru frontend
    const activity = rows.map((row) => ({
      date: formatDateLocal(row.date),
      count: Number(row.count)
    }));

    const streak = calculateStreak(activity);
    const totalActions = activity.reduce((sum, day) => sum + day.count, 0);
    const activeDays = activity.length; // câte zile distincte a fost activ

    return res.json({
      ok: true,
      activity,      // array de { date, count } pentru heatmap
      streak,        // numărul de zile consecutive curente
      totalActions,  // total acțiuni în ultimul an
      activeDays     // numărul de zile în care a fost activ
    });
  } catch (err) {
    console.error("GET ACTIVITY ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/dashboard
//
// Date agregate pentru pagina principală (PanouPrincipal).
//
// Ce face:
//   1. Ia numele userului
//   2. Ia toate joburile cu scorurile lor
//   3. Calculează scorul mediu de compatibilitate
//   4. Găsește jobul cu cel mai bun scor (bestJob) — folosit pentru focus
//   5. Ia activitatea pentru streak + heatmap
//
// Folosit în: PanouPrincipal.jsx
// ─────────────────────────────────────────────────────────────────────────────

router.get("/dashboard", auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    // Luăm numele userului pentru header ("Bună, Cristina")
    const [[userRow]] = await db.query(
      `SELECT name FROM users WHERE id = ?`,
      [userId]
    );

    // Toate joburile userului cu scorurile lor
    const [jobs] = await db.query(
      `SELECT id, title, company, match_score
       FROM jobs
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    // Activitate pentru heatmap și streak — cu detalii per tip acțiune
    const [activityRows] = await db.query(
      `SELECT
         DATE(created_at) AS date,
         COUNT(*) AS count
       FROM activity_log
       WHERE user_id = ?
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) ASC`,
      [userId]
    );

    // Detalii per zi pentru tooltip heatmap
    const [activityDetails] = await db.query(
      `SELECT
         DATE(created_at) AS date,
         action_type,
         COUNT(*) AS count
       FROM activity_log
       WHERE user_id = ?
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)
       GROUP BY DATE(created_at), action_type
       ORDER BY DATE(created_at) ASC`,
      [userId]
    );

    const detailsMap = {};
    for (const row of activityDetails) {
      const dateKey = formatDateLocal(row.date);
      if (!detailsMap[dateKey]) detailsMap[dateKey] = [];
      detailsMap[dateKey].push({ type: row.action_type, count: Number(row.count) });
    }

    const activity = activityRows.map((row) => ({
      date: formatDateLocal(row.date),
      count: Number(row.count),
      details: detailsMap[formatDateLocal(row.date)] || []
    }));

    const streak = calculateStreak(activity);
    const activeDays = activity.length;

    // Scorul mediu pe toate joburile
    const avgScore =
      jobs.length === 0
        ? 0
        : Math.round(
            jobs.reduce((sum, job) => sum + (Number(job.match_score) || 0), 0) /
              jobs.length
          );

    // Jobul cu scorul cel mai mare
    const bestJob =
      jobs.length === 0
        ? null
        : [...jobs].sort(
            (a, b) => (Number(b.match_score) || 0) - (Number(a.match_score) || 0)
          )[0];

    // Numărul de skills în profil
    const [skillCountRow] = await db.query(
      `SELECT COUNT(*) as cnt FROM user_skills WHERE user_id = ?`,
      [userId]
    );
    const skillCount = Number(skillCountRow[0]?.cnt || 0);

    return res.json({
      ok: true,
      user: { name: userRow?.name || "Utilizator" },
      avgScore,
      streak,
      activeDays,
      activity,
      skillCount,
      totalJobs: jobs.length,
      bestJob: bestJob
        ? {
            id: bestJob.id,
            title: bestJob.title,
            company: bestJob.company,
            score: Number(bestJob.match_score) || 0
          }
        : null
    });
  } catch (err) {
    console.error("GET DASHBOARD ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/shap/:jobId
//
// Explicabilitate locală — SHAP inspired (permutation-based feature importance)
//
// Ideea: pentru fiecare skill pe care userul NU îl are dar jobul îl cere,
// simulăm că userul ÎL ARE și măsurăm cu cât crește scorul.
// Diferența = contribuția marginală a acelui skill = shapValue.
//
// Exemplu concret:
//   Scor curent fără SQL: 62%
//   Scor simulat cu SQL:  75%
//   shapValue pentru SQL: 75 - 62 = +13pp
//
// Rezultatul e sortat descrescător — skill-ul cu cel mai mare impact
// apare primul. Asta îi spune userului "învață asta primul".
//
// Referință academică:
//   Lundberg & Lee (2017), NeurIPS — SHAP unified framework
//   Cogent Business & Management (2025), doi:10.1080/23311975.2025.2570881
//
// Folosit în: Analytics.jsx (matricea SHAP)
//             PanouPrincipal.jsx (focus săptămânal — primul skill din listă)
// ─────────────────────────────────────────────────────────────────────────────

router.get("/shap/:jobId", auth, async (req, res) => {
  const userId = req.user.userId;
  const jobId = Number(req.params.jobId);

  if (!Number.isFinite(jobId)) {
    return res.status(400).json({ ok: false, error: "Invalid job id" });
  }

  try {
    // 1. Verificăm că jobul există și aparține userului curent
    const [[job]] = await db.query(
      `SELECT id, title, company, match_score
       FROM jobs
       WHERE id = ? AND user_id = ?`,
      [jobId, userId]
    );

    if (!job) {
      return res.status(404).json({ ok: false, error: "Job negăsit" });
    }

    // 2. Toate skills cerute de job (din tabela job_skills + skills)
    const [jobSkills] = await db.query(
      `SELECT s.id AS skill_id, s.name, s.category, s.weight
       FROM job_skills js
       JOIN skills s ON s.id = js.skill_id
       WHERE js.job_id = ?`,
      [jobId]
    );

    // Dacă jobul nu are skills asociate, nu putem calcula nimic
    if (jobSkills.length === 0) {
      return res.json({
        ok: true,
        jobId,
        jobTitle: job.title,
        baseScore: 0,
        explanations: [],
        message: "Jobul nu are skills asociate. Analizează-l din nou."
      });
    }

    // 3. Skills pe care userul le are în profil
    const [userSkillRows] = await db.query(
      `SELECT skill_id FROM user_skills WHERE user_id = ?`,
      [userId]
    );
    const userSkillIds = new Set(userSkillRows.map((r) => r.skill_id));

    // 4. Scorul de bază — cât e compatibilitatea acum, fără nicio simulare
    const baseScore = calculateScore(userSkillIds, jobSkills);

    // 5. Gap-urile = skills cerute de job pe care userul NU le are
    const gaps = jobSkills.filter((s) => !userSkillIds.has(s.skill_id));

    // Dacă nu există gaps, userul acoperă tot — scor maxim
    if (gaps.length === 0) {
      return res.json({
        ok: true,
        jobId,
        jobTitle: job.title,
        baseScore,
        explanations: [],
        message: "Profilul tău acoperă complet cerințele acestui job!"
      });
    }

    // 6. Pentru fiecare gap, simulăm că userul ÎL ARE și calculăm impactul
    const explanations = gaps.map((skill) => {
      // Creăm un Set nou cu toate skills userului + skill-ul simulat
      const simulatedIds = new Set([...userSkillIds, skill.skill_id]);

      // Calculăm scorul cu skill-ul adăugat
      const scoreWith = calculateScore(simulatedIds, jobSkills);

      // shapValue = câte puncte procentuale adaugă acest skill
      const shapValue = scoreWith - baseScore;

      return {
        skillId: skill.skill_id,
        skill: skill.name,
        category: skill.category,
        weight: Number(skill.weight),
        shapValue,   // ex: 13 înseamnă +13pp
        scoreWith    // ex: 75 înseamnă că scorul ar fi 75% dacă ai skill-ul
      };
    });

    // 7. Sortăm descrescător după shapValue
    // Skill-ul cu cel mai mare impact apare primul
    explanations.sort((a, b) => b.shapValue - a.shapValue);

    return res.json({
      ok: true,
      jobId,
      jobTitle: job.title,
      baseScore,     // scorul curent al userului față de job
      explanations   // lista de skills lipsă cu impactul lor
    });
  } catch (err) {
    console.error("SHAP ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/market
//
// Analiză agregată pe toate joburile din portofoliu.
//
// Returnează:
//   - distribuția joburilor pe 3 zone de compatibilitate (fără prag fix)
//   - scorul mediu al portofoliului
//   - pentru fiecare skill lipsă: cu câte puncte crește scorul mediu
//     dacă l-ai dobândi
//   - bestNextSkill: skill-ul cu cel mai mare câștig mediu de scor
//
// NU folosim un prag fix de "eligibilitate" — utilizatorul interpretează
// singur ce înseamnă un scor bun pentru contextul lui.
//
// Referință: WEF Future of Jobs (2025)
//            Frontiers AI (2025) doi:10.3389/frai.2025.1660548
// ─────────────────────────────────────────────────────────────────────────────

router.get("/market", auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    // 1. Toate joburile userului
    const [jobs] = await db.query(
      `SELECT id, title, company, match_score
       FROM jobs
       WHERE user_id = ?`,
      [userId]
    );

    if (jobs.length === 0) {
      return res.json({
        ok: true,
        totalJobs: 0,
        avgScore: 0,
        distribution: { high: 0, medium: 0, low: 0 },
        skillsImpact: [],
        bestNextSkill: null,
        message: "Nu ai joburi salvate încă."
      });
    }

    // 2. Skills userului
    const [userSkillRows] = await db.query(
      `SELECT skill_id FROM user_skills WHERE user_id = ?`,
      [userId]
    );
    const userSkillIds = new Set(userSkillRows.map((r) => r.skill_id));

    // 3. Skills pentru toate joburile
    const jobIds = jobs.map((j) => j.id);
    const placeholders = jobIds.map(() => "?").join(",");

    const [allJobSkills] = await db.query(
      `SELECT js.job_id, s.id AS skill_id, s.name, s.category, s.weight
       FROM job_skills js
       JOIN skills s ON s.id = js.skill_id
       WHERE js.job_id IN (${placeholders})`,
      jobIds
    );

    const skillsByJob = {};
    for (const row of allJobSkills) {
      if (!skillsByJob[row.job_id]) skillsByJob[row.job_id] = [];
      skillsByJob[row.job_id].push(row);
    }

    // 4. Scorul mediu al portofoliului
    const avgScore = Math.round(
      jobs.reduce((sum, j) => sum + (Number(j.match_score) || 0), 0) / jobs.length
    );

    // 5. Distribuție pe 3 zone — fără prag fix de "eligibilitate"
    // Utilizatorul vede câte joburi sunt în fiecare zonă și decide singur
    const distribution = {
      high: 0,    // scor > 70% — compatibilitate înaltă
      medium: 0,  // scor 40-70% — compatibilitate medie
      low: 0      // scor < 40% — compatibilitate scăzută
    };

    for (const job of jobs) {
      const score = Number(job.match_score) || 0;
      if (score > 70) distribution.high++;
      else if (score >= 40) distribution.medium++;
      else distribution.low++;
    }

    // 6. Impact per skill lipsă — câte puncte crește scorul mediu
    // pentru fiecare skill pe care userul NU îl are
    const skillImpactMap = new Map();

    for (const job of jobs) {
      const jobSkills = skillsByJob[job.id] || [];
      const currentScore = calculateScore(userSkillIds, jobSkills);
      const gaps = jobSkills.filter((s) => !userSkillIds.has(s.skill_id));

      for (const skill of gaps) {
        const simulatedIds = new Set([...userSkillIds, skill.skill_id]);
        const scoreWith = calculateScore(simulatedIds, jobSkills);
        const gain = scoreWith - currentScore;

        // Includem skill-ul dacă adaugă cel puțin 1 punct
        if (gain > 0) {
          if (!skillImpactMap.has(skill.skill_id)) {
            skillImpactMap.set(skill.skill_id, {
              skillId: skill.skill_id,
              name: skill.name,
              category: skill.category,
              weight: Number(skill.weight),
              totalGain: 0,
              jobsAffected: new Set()
            });
          }
          const entry = skillImpactMap.get(skill.skill_id);
          entry.totalGain += gain;
          entry.jobsAffected.add(job.id);
        }
      }
    }

    // 7. Construim lista sortată după câștig mediu per job afectat
    const skillsImpact = Array.from(skillImpactMap.values())
      .map((s) => ({
        skillId: s.skillId,
        name: s.name,
        category: s.category,
        weight: s.weight,
        jobsAffected: s.jobsAffected.size,
        // Câștig mediu de scor per job afectat
        avgGain: Math.round(s.totalGain / s.jobsAffected.size)
      }))
      .sort((a, b) =>
        b.avgGain - a.avgGain ||         // sortare primară: câștig mediu
        b.jobsAffected - a.jobsAffected  // sortare secundară: joburi afectate
      );

    const bestNextSkill = skillsImpact.length > 0 ? skillsImpact[0] : null;

    return res.json({
      ok: true,
      totalJobs: jobs.length,
      avgScore,
      distribution,    // { high, medium, low }
      skillsImpact,
      bestNextSkill
    });
  } catch (err) {
    console.error("MARKET ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/profile-vs-market
//
// Compară profilul utilizatorului față de cerințele medii ale pieței
// (joburile salvate), pe categorii de skills.
//
// Pentru fiecare categorie (Data, BI, Tools, DevOps, Business):
//   - userCoverage: % din skills din categorie pe care userul le are
//   - marketDemand: % din skills din categorie cerute în medie de joburi
//   - gap: diferența dintre cele două
//
// Exemplu:
//   Data: userCoverage=60%, marketDemand=80%, gap=-20pp → user în urmă
//   Business: userCoverage=50%, marketDemand=45%, gap=+5pp → user peste piață
//
// Referință academică:
//   Social Comparison Theory (Festinger, 1954) — utilizatorul se vede
//   față de un benchmark real, stimulând auto-reglarea comportamentului
//   Paulsen & Lindsay (2024), Educ. Inf. Technol., doi:10.1007/s10639-023-12401-4
//
// Folosit în: Analytics.jsx (secțiunea Profil vs. Piață)
// ─────────────────────────────────────────────────────────────────────────────

router.get("/profile-vs-market", auth, async (req, res) => {
  const userId = req.user.userId;

  try {
    // 1. Toate skills din catalog, grupate pe categorie
    const [allSkills] = await db.query(
      `SELECT id, name, category, weight FROM skills ORDER BY category, name`
    );

    // 2. Skills pe care userul le are
    const [userSkillRows] = await db.query(
      `SELECT skill_id FROM user_skills WHERE user_id = ?`,
      [userId]
    );
    const userSkillIds = new Set(userSkillRows.map((r) => r.skill_id));

    // 3. Joburile userului
    const [jobs] = await db.query(
      `SELECT id FROM jobs WHERE user_id = ?`,
      [userId]
    );

    if (jobs.length === 0) {
      return res.json({
        ok: true,
        categories: [],
        topGapCategory: null,
        message: "Nu ai joburi salvate. Adaugă joburi pentru a vedea comparația."
      });
    }

    // 4. Toate skills cerute de joburile userului
    const jobIds = jobs.map((j) => j.id);
    const placeholders = jobIds.map(() => "?").join(",");

    const [jobSkillRows] = await db.query(
      `SELECT DISTINCT skill_id FROM job_skills WHERE job_id IN (${placeholders})`,
      jobIds
    );
    const marketSkillIds = new Set(jobSkillRows.map((r) => r.skill_id));

    // 5. Construim comparația pe categorii
    // Grupăm toate skills din catalog pe categorie
    // Acum păstrăm și lista individuală de skills per categorie
    const categoriesMap = {};

    for (const skill of allSkills) {
      if (!categoriesMap[skill.category]) {
        categoriesMap[skill.category] = {
          category: skill.category,
          totalSkills: 0,
          userHas: 0,
          marketNeeds: 0,
          // Liste cu skill-uri individuale pentru afișare expandabilă
          skills: []  // fiecare element: { id, name, userHas, marketNeeds }
        };
      }

      const cat = categoriesMap[skill.category];
      cat.totalSkills += 1;

      const hasUser = userSkillIds.has(skill.id);
      const hasMarket = marketSkillIds.has(skill.id);

      if (hasUser) cat.userHas += 1;
      if (hasMarket) cat.marketNeeds += 1;

      // Adăugăm skill-ul în lista individuală
      // Afișăm doar skills relevante: le are userul SAU le cer joburile
      // Skills pe care nu le are nimeni și nu le cere nimeni = omise
      if (hasUser || hasMarket) {
        cat.skills.push({
          id: skill.id,
          name: skill.name,
          // ✓ ai tu + cer joburile
          // ✓ ai tu, dar nu cer joburile
          // ✗ nu ai, dar cer joburile
          // (skills pe care nu le ai și nu le cer sunt omise)
          userHas: hasUser,
          marketNeeds: hasMarket
        });
      }
    }

    // 6. Calculăm acoperirea per categorie
    // Metrica corectă: câte din skills CERUTE le ai tu
    // acoperire = skills cerute pe care le ai / total skills cerute
    const categories = Object.values(categoriesMap)
      .filter((cat) => cat.marketNeeds > 0)  // doar categorii cerute de joburile tale
      .map((cat) => {
        // Skills cerute pe care le ai — intersecția
        const coveredRequired = cat.skills.filter(
          (s) => s.userHas && s.marketNeeds
        ).length;

        // Skills cerute pe care NU le ai — gap-ul real
        const missingSkills = cat.skills
          .filter((s) => !s.userHas && s.marketNeeds)
          .map((s) => s.name);

        // Skills pe care le ai dar nu sunt cerute — "în plus"
        const extraSkills = cat.skills
          .filter((s) => s.userHas && !s.marketNeeds)
          .map((s) => s.name);

        // Procentul de acoperire din ce e cerut
        const coveragePercent = cat.marketNeeds === 0
          ? 100
          : Math.round((coveredRequired / cat.marketNeeds) * 100);

        const skillsSorted = cat.skills.sort((a, b) => {
          // Lipsă și cerute → primele
          if (!a.userHas && a.marketNeeds && (b.userHas || !b.marketNeeds)) return -1;
          if (!b.userHas && b.marketNeeds && (a.userHas || !a.marketNeeds)) return 1;
          // Cerute și ai → al doilea
          if (a.userHas && a.marketNeeds && !b.marketNeeds) return -1;
          if (b.userHas && b.marketNeeds && !a.marketNeeds) return 1;
          return a.name.localeCompare(b.name);
        });

        return {
          category: cat.category,
          coveredRequired,       // câte skills cerute le ai
          marketNeeds: cat.marketNeeds,  // total skills cerute
          coveragePercent,       // % acoperire din ce e cerut
          missingSkills,         // lista skills lipsă (cerute, nu le ai)
          extraSkills,           // lista skills în plus (le ai, nu sunt cerute)
          userHas: cat.userHas,
          skills: skillsSorted
        };
      })
      .sort((a, b) => a.coveragePercent - b.coveragePercent); // cele mai slabe primele

    // 7. Insight textual bazat pe skills lipsă concrete
    const allMissingSkills = categories.flatMap((c) => c.missingSkills);
    const allExtraSkills = categories.flatMap((c) => c.extraSkills);

    let insight = null;
    if (allMissingSkills.length === 0) {
      insight = "Ai toate skills-urile cerute de joburile salvate.";
    } else if (allMissingSkills.length <= 3) {
      insight = `Îți lipsesc ${allMissingSkills.length} skills cerute: ${allMissingSkills.join(", ")}.`;
      if (allExtraSkills.length > 0) {
        insight += ` Ai în plus: ${allExtraSkills.slice(0, 3).join(", ")}${allExtraSkills.length > 3 ? " și altele" : ""}.`;
      }
    } else {
      insight = `Îți lipsesc ${allMissingSkills.length} skills cerute. Prioritare: ${allMissingSkills.slice(0, 3).join(", ")}.`;
      if (allExtraSkills.length > 0) {
        insight += ` Ai în plus față de cerințe: ${allExtraSkills.slice(0, 2).join(", ")} și altele.`;
      }
    }

    return res.json({
      ok: true,
      categories,
      insight,
      totalJobs: jobs.length
    });
  } catch (err) {
    console.error("PROFILE VS MARKET ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;