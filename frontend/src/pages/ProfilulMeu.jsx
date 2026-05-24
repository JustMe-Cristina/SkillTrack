import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";
import { apiFetch } from "../services/api";

const EMPTY_PROFILE = {
  full_name: "",
  email: "",
  headline: "",
  university: "",
  specialization: "",
  study_year: "",
  city: "",
  target_role: "",
  preferred_work_mode: "",
  about: ""
};

const LEVEL_LABELS = {
  1: "Fundamental",
  2: "Intermediar",
  3: "Avansat"
};

const CATEGORY_LABELS = {
  DATA: "Data",
  BI: "Business Intelligence",
  BUSINESS: "Business",
  PM: "Project Management",
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  FULLSTACK: "Full Stack",
  QA: "QA",
  AI_ML: "AI / ML"
};

const WORK_MODE_LABELS = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "On-site"
};

function normalizeArray(data, keys = []) {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return [];
}

function getSkillLevel(skill) {
  return Number(skill.level ?? skill.current_level ?? 1);
}

function getSkillCategory(skill) {
  return skill.category || "Altele";
}

function average(values) {
  const validValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (validValues.length === 0) return 0;

  return Math.round(
    validValues.reduce((sum, value) => sum + value, 0) / validValues.length
  );
}

function countBy(items, getter) {
  const result = {};

  items.forEach((item) => {
    const key = getter(item) || "N/A";
    result[key] = (result[key] || 0) + 1;
  });

  return result;
}

function getTopCategory(skills) {
  const counts = countBy(skills, getSkillCategory);
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return entries[0]?.[0] || "Nedefinit";
}

function getBestJob(jobs) {
  return (
    [...jobs].sort(
      (a, b) => Number(b.match_score || 0) - Number(a.match_score || 0)
    )[0] || null
  );
}

function getOfferJobs(jobs) {
  return jobs.filter((job) => job.status === "OFERTA");
}

function getCompletedRoadmaps(roadmaps) {
  return roadmaps.filter(
    (roadmap) =>
      roadmap.status === "COMPLETED" || Number(roadmap.progress || 0) === 100
  );
}

function getActiveRoadmaps(roadmaps) {
  return roadmaps.filter(
    (roadmap) =>
      roadmap.status !== "COMPLETED" && Number(roadmap.progress || 0) < 100
  );
}

function getDominantJobCategory(jobs) {
  const counts = countBy(
    jobs.filter((job) => job.ml_predicted_category),
    (job) => job.ml_predicted_category
  );

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (!entries.length) return "N/A";

  return CATEGORY_LABELS[entries[0][0]] || entries[0][0];
}

function formatDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function buildReport({
  profile,
  skills,
  jobs,
  roadmaps,
  bestJob,
  offerJobs,
  completedRoadmaps,
  activeRoadmaps,
  avgProgress,
  topSkillCategory,
  dominantJobCategory
}) {
  const advancedSkills = skills.filter((skill) => getSkillLevel(skill) === 3);
  const intermediateSkills = skills.filter((skill) => getSkillLevel(skill) === 2);
  const fundamentalSkills = skills.filter((skill) => getSkillLevel(skill) === 1);

  return {
    generatedAt: new Date(),
    profile,
    profileSummary: {
      totalSkills: skills.length,
      fundamentalSkills: fundamentalSkills.length,
      intermediateSkills: intermediateSkills.length,
      advancedSkills: advancedSkills.length,
      topSkillCategory
    },
    jobSummary: {
      totalJobs: jobs.length,
      bestJob,
      offers: offerJobs.length,
      dominantJobCategory
    },
    roadmapSummary: {
      totalRoadmaps: roadmaps.length,
      activeRoadmaps: activeRoadmaps.length,
      completedRoadmaps: completedRoadmaps.length,
      avgProgress
    },
    recommendation:
      activeRoadmaps.length > 0
        ? "Continuă learning plan-ul activ cu cel mai mare impact asupra joburilor urmărite."
        : jobs.length > 0
        ? "Generează un learning plan pentru cel mai relevant job salvat."
        : "Analizează și salvează primul job pentru a începe dezvoltarea profilului."
  };
}

export default function ProfilulMeu() {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [skills, setSkills] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setMessage("");

    try {
      const [skillsData, jobsData, roadmapsData, profileData] =
        await Promise.all([
          apiFetch("/api/user-skills").catch(() => null),
          apiFetch("/api/jobs").catch(() => null),
          apiFetch("/api/roadmaps").catch(() => null),
          apiFetch("/api/profile").catch(() => null)
        ]);

      setSkills(normalizeArray(skillsData, ["skills", "userSkills"]));
      setJobs(normalizeArray(jobsData, ["jobs", "data"]));
      setRoadmaps(normalizeArray(roadmapsData, ["roadmaps", "data"]));

      if (profileData?.profile) {
        setProfile((prev) => ({
          ...prev,
          ...profileData.profile
        }));
      }
    } catch (err) {
      console.error("LOAD PROFILE ERROR:", err);
      setMessage(err.message || "Nu s-au putut încărca datele profilului.");
    } finally {
      setLoading(false);
    }
  }

  function updateProfileField(field, value) {
    setProfile((prev) => ({
      ...prev,
      [field]: value
    }));
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    setMessage("");

    try {
      const data = await apiFetch("/api/profile", {
        method: "PUT",
        body: JSON.stringify(profile)
      });

      if (data?.profile) {
        setProfile((prev) => ({
          ...prev,
          ...data.profile
        }));
      }

      setEditingProfile(false);
      setMessage("Profilul a fost actualizat cu succes.");
    } catch (err) {
      console.error("SAVE PROFILE ERROR:", err);
      setMessage(
        err.message ||
          "Nu s-a putut salva profilul. Verifică endpoint-ul /api/profile."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  function handlePrintReport() {
    setShowReport(true);

    setTimeout(() => {
      window.print();
    }, 100);
  }

  const stats = useMemo(() => {
    const bestJob = getBestJob(jobs);
    const offerJobs = getOfferJobs(jobs);
    const completedRoadmaps = getCompletedRoadmaps(roadmaps);
    const activeRoadmaps = getActiveRoadmaps(roadmaps);
    const avgProgress = average(roadmaps.map((roadmap) => roadmap.progress));

    return {
      bestJob,
      offerJobs,
      completedRoadmaps,
      activeRoadmaps,
      avgProgress,
      topSkillCategory: getTopCategory(skills),
      dominantJobCategory: getDominantJobCategory(jobs)
    };
  }, [skills, jobs, roadmaps]);

  const levelStats = useMemo(() => {
    return {
      fundamental: skills.filter((skill) => getSkillLevel(skill) === 1).length,
      intermediate: skills.filter((skill) => getSkillLevel(skill) === 2).length,
      advanced: skills.filter((skill) => getSkillLevel(skill) === 3).length
    };
  }, [skills]);

  const categoryChart = useMemo(() => {
    const counts = countBy(skills, getSkillCategory);

    return Object.entries(counts)
      .map(([category, total]) => ({
        category,
        total
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [skills]);

  const achievements = useMemo(() => {
    const hasJob = jobs.length > 0;
    const hasRoadmap = roadmaps.length > 0;
    const hasCompletedRoadmap = stats.completedRoadmaps.length > 0;
    const hasOffer = stats.offerJobs.length > 0;
    const hasAdvancedSkill = levelStats.advanced > 0;

    return [
      {
        id: "first-job",
        icon: "💼",
        title: "Primul job",
        description: "Job salvat",
        unlocked: hasJob
      },
      {
        id: "first-roadmap",
        icon: "🧭",
        title: "Learning plan",
        description: "Plan generat",
        unlocked: hasRoadmap
      },
      {
        id: "completed-roadmap",
        icon: "✅",
        title: "Roadmap finalizat",
        description: "100% progres",
        unlocked: hasCompletedRoadmap
      },
      {
        id: "advanced-skill",
        icon: "⭐",
        title: "Skill avansat",
        description: "Nivel avansat",
        unlocked: hasAdvancedSkill
      },
      {
        id: "offer",
        icon: "🏆",
        title: "Ofertă primită",
        description: "Rezultat final",
        unlocked: hasOffer,
        special: true
      }
    ];
  }, [jobs, roadmaps, stats, levelStats]);

  const report = useMemo(() => {
    return buildReport({
      profile,
      skills,
      jobs,
      roadmaps,
      bestJob: stats.bestJob,
      offerJobs: stats.offerJobs,
      completedRoadmaps: stats.completedRoadmaps,
      activeRoadmaps: stats.activeRoadmaps,
      avgProgress: stats.avgProgress,
      topSkillCategory: stats.topSkillCategory,
      dominantJobCategory: stats.dominantJobCategory
    });
  }, [profile, skills, jobs, roadmaps, stats]);

  const profileInitials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <AppLayout
      title="Profilul meu"
      subtitle="Imagine de ansamblu asupra progresului tău profesional."
    >
      <div style={styles.page}>
        {message && <div style={styles.message}>{message}</div>}

        {loading ? (
          <div style={styles.card}>
            <div style={styles.muted}>Se încarcă profilul...</div>
          </div>
        ) : (
          <>
            <section style={styles.heroCard}>
              <div style={styles.heroContent}>
                <div style={styles.avatarCircle}>{profileInitials}</div>

                <div>
                  <div style={styles.eyebrow}>SkillTrack Career Profile</div>

                  <h2 style={styles.heroTitle}>
                    {profile.full_name || "Completează profilul tău"}
                  </h2>

                  <p style={styles.heroText}>
                    {profile.about ||
                      "Adaugă câteva informații despre tine, direcția ta profesională și obiectivele de carieră."}
                  </p>

                  <div style={styles.profileTags}>
                    <span>
                      {profile.headline || "Headline profesional nespecificat"}
                    </span>
                    <span>{profile.city || "Oraș nespecificat"}</span>
                    <span>
                      {profile.target_role || "Rol țintă nespecificat"}
                    </span>
                  </div>

                  <button
                    type="button"
                    style={styles.editProfileButton}
                    onClick={() => setEditingProfile((prev) => !prev)}
                  >
                    {editingProfile ? "Închide editarea" : "Editează profilul"}
                  </button>
                </div>
              </div>

              <div style={styles.heroStatsPanel}>
                <MiniStat value={skills.length} label="Skilluri" />
                <MiniStat value={jobs.length} label="Joburi urmărite" />
                <MiniStat value={roadmaps.length} label="Learning plan-uri" />
              </div>
            </section>

            {editingProfile && (
              <section style={styles.profileEditCard}>
                <div style={styles.sectionHeaderCompact}>
                  <div>
                    <div style={styles.sectionLabel}>Date profil</div>

                    <h2 style={styles.sectionTitle}>
                      Editează informațiile profilului
                    </h2>

                    <p style={styles.smallText}>
                      Aceste informații personalizează pagina ta de profil și
                      raportul de carieră.
                    </p>
                  </div>
                </div>

                <div style={styles.profileFormGrid}>
                  <label style={styles.inputGroup}>
                    Nume complet
                    <input
                      style={styles.input}
                      placeholder="Ex: Ana Ionescu"
                      value={profile.full_name || ""}
                      onChange={(event) =>
                        updateProfileField("full_name", event.target.value)
                      }
                    />
                  </label>

                  <label style={styles.inputGroup}>
                    Email
                    <input
                      style={styles.input}
                      placeholder="Ex: ana@email.com"
                      value={profile.email || ""}
                      onChange={(event) =>
                        updateProfileField("email", event.target.value)
                      }
                    />
                  </label>

                  <label style={styles.inputGroupFull}>
                    Headline profesional
                    <input
                      style={styles.input}
                      placeholder="Ex: Business Information Systems · Data & Tech"
                      value={profile.headline || ""}
                      onChange={(event) =>
                        updateProfileField("headline", event.target.value)
                      }
                    />
                  </label>

                  <label style={styles.inputGroup}>
                    Universitate
                    <input
                      style={styles.input}
                      placeholder="Ex: Universitatea Babeș-Bolyai"
                      value={profile.university || ""}
                      onChange={(event) =>
                        updateProfileField("university", event.target.value)
                      }
                    />
                  </label>

                  <label style={styles.inputGroup}>
                    Specializare
                    <input
                      style={styles.input}
                      placeholder="Ex: Informatică Economică"
                      value={profile.specialization || ""}
                      onChange={(event) =>
                        updateProfileField("specialization", event.target.value)
                      }
                    />
                  </label>

                  <label style={styles.inputGroup}>
                    An de studiu
                    <input
                      style={styles.input}
                      placeholder="Ex: Anul 3"
                      value={profile.study_year || ""}
                      onChange={(event) =>
                        updateProfileField("study_year", event.target.value)
                      }
                    />
                  </label>

                  <label style={styles.inputGroup}>
                    Oraș
                    <input
                      style={styles.input}
                      placeholder="Ex: Cluj-Napoca"
                      value={profile.city || ""}
                      onChange={(event) =>
                        updateProfileField("city", event.target.value)
                      }
                    />
                  </label>

                  <label style={styles.inputGroup}>
                    Rol țintă
                    <input
                      style={styles.input}
                      placeholder="Ex: Data Analyst / Business Analyst"
                      value={profile.target_role || ""}
                      onChange={(event) =>
                        updateProfileField("target_role", event.target.value)
                      }
                    />
                  </label>

                  <label style={styles.inputGroup}>
                    Work mode preferat
                    <select
                      style={styles.input}
                      value={profile.preferred_work_mode || ""}
                      onChange={(event) =>
                        updateProfileField(
                          "preferred_work_mode",
                          event.target.value
                        )
                      }
                    >
                      <option value="">Nespecificat</option>
                      <option value="REMOTE">Remote</option>
                      <option value="HYBRID">Hybrid</option>
                      <option value="ONSITE">On-site</option>
                    </select>
                  </label>

                  <label style={styles.inputGroupFull}>
                    Despre mine
                    <textarea
                      style={styles.textarea}
                      placeholder="Scrie pe scurt direcția ta profesională, obiectivele și tipul de roluri care te interesează."
                      value={profile.about || ""}
                      onChange={(event) =>
                        updateProfileField("about", event.target.value)
                      }
                    />
                  </label>
                </div>

                <div style={styles.formActions}>
                  <button
                    type="button"
                    style={styles.saveProfileButton}
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                  >
                    {savingProfile
                      ? "Se salvează..."
                      : "Salvează modificările"}
                  </button>

                  <button
                    type="button"
                    style={styles.cancelProfileButton}
                    onClick={() => setEditingProfile(false)}
                  >
                    Anulează
                  </button>
                </div>
              </section>
            )}

            <section style={styles.careerGrid}>
              <div style={styles.careerProfileCard}>
                <div style={styles.sectionLabel}>Profil carieră</div>

                <h2 style={styles.sectionTitle}>Direcție profesională</h2>

                <p style={styles.careerText}>
                  Profilul tău este construit pe baza competențelor salvate,
                  joburilor urmărite și learning plan-urilor generate. Zona
                  dominantă de competențe este{" "}
                  <strong>{stats.topSkillCategory}</strong>, iar joburile
                  urmărite indică interes pentru{" "}
                  <strong>{stats.dominantJobCategory}</strong>.
                </p>

                <div style={styles.careerHighlights}>
                  <div style={styles.highlightBox}>
                    <span>Cel mai bun match</span>
                    <strong>
                      {stats.bestJob
                        ? `${stats.bestJob.match_score || 0}%`
                        : "-"}
                    </strong>
                  </div>

                  <div style={styles.highlightBox}>
                    <span>Oferte</span>
                    <strong>{stats.offerJobs.length}</strong>
                  </div>

                  <div style={styles.highlightBox}>
                    <span>Progres planuri</span>
                    <strong>{stats.avgProgress}%</strong>
                  </div>
                </div>
              </div>

              {stats.offerJobs.length > 0 ? (
                <div style={styles.offerAchievementUnlocked}>
                  <div style={styles.offerIcon}>🏆</div>

                  <div>
                    <div style={styles.offerEyebrow}>Achievement unlocked</div>

                    <h2 style={styles.offerTitle}>Ofertă primită</h2>

                    <p style={styles.offerText}>
                      Ai marcat {stats.offerJobs.length}{" "}
                      {stats.offerJobs.length === 1 ? "job" : "joburi"} cu
                      statusul „Ofertă”.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={styles.offerAchievementLocked}>
                  <div style={styles.offerIconLocked}>🔒</div>

                  <div>
                    <div style={styles.offerEyebrowLocked}>Premiu blocat</div>

                    <h2 style={styles.offerTitleLocked}>Ofertă primită</h2>

                    <p style={styles.offerTextLocked}>
                      Se deblochează când marchezi un job cu statusul „Ofertă”.
                    </p>
                  </div>
                </div>
              )}
            </section>

            <section style={styles.card}>
              <div style={styles.sectionHeaderCompact}>
                <div>
                  <div style={styles.sectionLabel}>Premii personale</div>

                  <h2 style={styles.sectionTitle}>Achievement-uri</h2>
                </div>

                <span style={styles.countPill}>
                  {achievements.filter((item) => item.unlocked).length}/
                  {achievements.length} deblocate
                </span>
              </div>

              <div style={styles.achievementRow}>
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    style={{
                      ...styles.achievementMiniCard,
                      ...(achievement.unlocked
                        ? styles.achievementMiniUnlocked
                        : styles.achievementMiniLocked),
                      ...(achievement.special && achievement.unlocked
                        ? styles.achievementMiniSpecial
                        : {})
                    }}
                  >
                    <div style={styles.achievementMiniIcon}>
                      {achievement.unlocked ? achievement.icon : "🔒"}
                    </div>

                    <div style={styles.achievementMiniContent}>
                      <strong>{achievement.title}</strong>
                      <span>{achievement.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section style={styles.analyticsGrid}>
              <div style={styles.card}>
                <div style={styles.sectionLabel}>Niveluri competențe</div>

                <h2 style={styles.sectionTitle}>Distribuție skilluri</h2>

                <div style={styles.levelList}>
                  <LevelRow
                    label={LEVEL_LABELS[1]}
                    value={levelStats.fundamental}
                    total={skills.length}
                  />

                  <LevelRow
                    label={LEVEL_LABELS[2]}
                    value={levelStats.intermediate}
                    total={skills.length}
                  />

                  <LevelRow
                    label={LEVEL_LABELS[3]}
                    value={levelStats.advanced}
                    total={skills.length}
                  />
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.sectionLabel}>Categorii skilluri</div>

                <h2 style={styles.sectionTitle}>Profil competențe</h2>

                {categoryChart.length > 0 ? (
                  <div style={styles.categoryChart}>
                    {categoryChart.map((item) => {
                      const max = Math.max(
                        ...categoryChart.map((entry) => entry.total),
                        1
                      );

                      const width = Math.round((item.total / max) * 100);

                      return (
                        <div key={item.category} style={styles.categoryRow}>
                          <div style={styles.categoryTop}>
                            <span>{item.category}</span>
                            <strong>{item.total}</strong>
                          </div>

                          <div style={styles.categoryTrack}>
                            <div
                              style={{
                                ...styles.categoryFill,
                                width: `${width}%`
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState message="Nu există încă skilluri salvate." />
                )}
              </div>
            </section>

            <section style={styles.reportCard}>
              <div>
                <div style={styles.sectionLabelLight}>Raport carieră</div>

                <h2 style={styles.reportCardTitle}>
                  Generează raport SkillTrack
                </h2>

                <p style={styles.reportCardText}>
                  Raportul sintetizează profilul, competențele, joburile
                  urmărite, progresul learning plan-urilor, ofertele și
                  recomandarea următorului pas.
                </p>
              </div>

              <div style={styles.reportActions}>
                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={() => setShowReport((prev) => !prev)}
                >
                  {showReport ? "Ascunde raportul" : "Generează raport"}
                </button>

                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={handlePrintReport}
                >
                  Printează / salvează PDF
                </button>
              </div>
            </section>

            {showReport && (
              <section style={styles.printArea}>
                <div style={styles.reportPreview}>
                  <div style={styles.reportHeader}>
                    <div>
                      <div style={styles.reportEyebrow}>Raport SkillTrack</div>

                      <h2 style={styles.reportTitle}>Profil carieră</h2>

                      <p style={styles.reportDate}>
                        Generat la {formatDate(report.generatedAt)}
                      </p>
                    </div>

                    <div style={styles.reportBadge}>
                      {profile.full_name || "Profil utilizator"}
                    </div>
                  </div>

                  <div style={styles.reportGrid}>
                    <ReportBlock
                      title="Date profil"
                      items={[
                        `Headline: ${report.profile.headline || "-"}`,
                        `Universitate: ${report.profile.university || "-"}`,
                        `Specializare: ${report.profile.specialization || "-"}`,
                        `Oraș: ${report.profile.city || "-"}`,
                        `Rol țintă: ${report.profile.target_role || "-"}`,
                        `Work mode preferat: ${
                          WORK_MODE_LABELS[
                            report.profile.preferred_work_mode
                          ] ||
                          report.profile.preferred_work_mode ||
                          "-"
                        }`
                      ]}
                    />

                    <ReportBlock
                      title="Profil competențe"
                      items={[
                        `Total skilluri: ${report.profileSummary.totalSkills}`,
                        `Fundamental: ${report.profileSummary.fundamentalSkills}`,
                        `Intermediar: ${report.profileSummary.intermediateSkills}`,
                        `Avansat: ${report.profileSummary.advancedSkills}`,
                        `Categorie dominantă: ${report.profileSummary.topSkillCategory}`
                      ]}
                    />

                    <ReportBlock
                      title="Joburi urmărite"
                      items={[
                        `Total joburi: ${report.jobSummary.totalJobs}`,
                        `Cel mai bun match: ${
                          report.jobSummary.bestJob?.title || "-"
                        }`,
                        `Oferte primite: ${report.jobSummary.offers}`,
                        `Categorie dominantă: ${report.jobSummary.dominantJobCategory}`
                      ]}
                    />

                    <ReportBlock
                      title="Learning plan-uri"
                      items={[
                        `Total planuri: ${report.roadmapSummary.totalRoadmaps}`,
                        `Planuri active: ${report.roadmapSummary.activeRoadmaps}`,
                        `Planuri finalizate: ${report.roadmapSummary.completedRoadmaps}`,
                        `Progres mediu: ${report.roadmapSummary.avgProgress}%`
                      ]}
                    />
                  </div>

                  <div style={styles.recommendationBox}>
                    <strong>Recomandare următor pas</strong>
                    <p>{report.recommendation}</p>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

function MiniStat({ value, label }) {
  return (
    <div style={styles.miniStat}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ReportBlock({ title, items }) {
  return (
    <div style={styles.reportBlock}>
      <h3>{title}</h3>

      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function LevelRow({ label, value, total }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div style={styles.levelRow}>
      <div style={styles.levelTop}>
        <span>{label}</span>
        <strong>
          {value} · {percent}%
        </strong>
      </div>

      <div style={styles.levelTrack}>
        <div
          style={{
            ...styles.levelFill,
            width: `${percent}%`
          }}
        />
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return <div style={styles.emptyState}>{message}</div>;
}

const styles = {
  page: {
    display: "grid",
    gap: 16,
    paddingBottom: 24
  },

  message: {
    padding: 12,
    borderRadius: 12,
    background: "#ffffff",
    color: "#374151",
    boxShadow: "0 10px 30px rgba(0,0,0,0.04)"
  },

  muted: {
    color: "#9ca3af",
    fontSize: 14
  },

  card: {
    background: "#ffffff",
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 10px 30px rgba(15,23,42,0.05)",
    border: "1px solid #e5e7eb"
  },

  heroCard: {
    display: "grid",
    gridTemplateColumns: "1fr 280px",
    gap: 18,
    padding: 18,
    borderRadius: 20,
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(239,246,255,0.9))",
    border: "1px solid #dbeafe",
    boxShadow: "0 12px 34px rgba(15,23,42,0.06)"
  },

  heroContent: {
    display: "flex",
    alignItems: "center",
    gap: 16
  },

  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "#111827",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    fontWeight: 900,
    flexShrink: 0,
    boxShadow: "0 10px 24px rgba(15,23,42,0.14)"
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: 900,
    color: "#4f46e5",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 6
  },

  heroTitle: {
    margin: 0,
    fontSize: 28,
    lineHeight: 1.1,
    color: "#111827",
    letterSpacing: "-0.04em"
  },

  heroText: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.55,
    maxWidth: 780
  },

  profileTags: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 10,
    fontSize: 12,
    fontWeight: 700,
    color: "#475569"
  },

  editProfileButton: {
    marginTop: 12,
    padding: "9px 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 13
  },

  heroStatsPanel: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 8
  },

  miniStat: {
    borderRadius: 14,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 3,
    boxShadow: "0 6px 18px rgba(15,23,42,0.035)"
  },

  profileEditCard: {
    background: "#ffffff",
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 10px 30px rgba(15,23,42,0.05)",
    border: "1px solid #e0e7ff"
  },

  profileFormGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    marginTop: 16
  },

  inputGroup: {
    display: "grid",
    gap: 6,
    color: "#475569",
    fontSize: 13,
    fontWeight: 800
  },

  inputGroupFull: {
    display: "grid",
    gridColumn: "1 / -1",
    gap: 6,
    color: "#475569",
    fontSize: 13,
    fontWeight: 800
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d1d5db",
    borderRadius: 12,
    padding: "11px 12px",
    background: "#ffffff",
    color: "#111827",
    outline: "none",
    fontSize: 14
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 90,
    resize: "vertical",
    border: "1px solid #d1d5db",
    borderRadius: 12,
    padding: "11px 12px",
    background: "#ffffff",
    color: "#111827",
    outline: "none",
    fontSize: 14,
    fontFamily: "inherit"
  },

  formActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 16
  },

  saveProfileButton: {
    padding: "11px 15px",
    borderRadius: 12,
    border: "none",
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 900
  },

  cancelProfileButton: {
    padding: "11px 15px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 900
  },

  careerGrid: {
    display: "grid",
    gridTemplateColumns: "1.3fr 0.7fr",
    gap: 16
  },

  careerProfileCard: {
    background: "#ffffff",
    borderRadius: 22,
    padding: 22,
    border: "1px solid #e5e7eb",
    boxShadow: "0 10px 30px rgba(15,23,42,0.05)"
  },

  careerText: {
    margin: "10px 0 0",
    color: "#475569",
    lineHeight: 1.7,
    fontSize: 14
  },

  careerHighlights: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginTop: 16
  },

  highlightBox: {
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 12,
    display: "grid",
    gap: 5
  },

  offerAchievementUnlocked: {
    display: "flex",
    gap: 14,
    alignItems: "center",
    padding: 20,
    borderRadius: 22,
    background: "linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)",
    border: "1px solid #fde68a",
    boxShadow: "0 14px 36px rgba(245,158,11,0.12)"
  },

  offerAchievementLocked: {
    display: "flex",
    gap: 14,
    alignItems: "center",
    padding: 20,
    borderRadius: 22,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    boxShadow: "0 10px 30px rgba(15,23,42,0.05)"
  },

  offerIcon: {
    width: 58,
    height: 58,
    borderRadius: "50%",
    background: "#f59e0b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 32,
    flexShrink: 0
  },

  offerIconLocked: {
    width: 58,
    height: 58,
    borderRadius: "50%",
    background: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    flexShrink: 0
  },

  offerEyebrow: {
    color: "#92400e",
    fontSize: 11,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 1.2
  },

  offerEyebrowLocked: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 1.2
  },

  offerTitle: {
    margin: "5px 0",
    color: "#78350f",
    fontSize: 22
  },

  offerTitleLocked: {
    margin: "5px 0",
    color: "#111827",
    fontSize: 22
  },

  offerText: {
    margin: 0,
    color: "#92400e",
    lineHeight: 1.55,
    fontSize: 13
  },

  offerTextLocked: {
    margin: 0,
    color: "#64748b",
    lineHeight: 1.55,
    fontSize: 13
  },

  sectionHeaderCompact: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 14
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: 900,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8
  },

  sectionLabelLight: {
    fontSize: 11,
    fontWeight: 900,
    color: "#cbd5e1",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8
  },

  sectionTitle: {
    margin: 0,
    color: "#111827",
    fontSize: 20,
    letterSpacing: "-0.02em"
  },

  smallText: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.6
  },

  countPill: {
    padding: "8px 11px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#4338ca",
    fontSize: 13,
    fontWeight: 800,
    whiteSpace: "nowrap"
  },

  achievementRow: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 10
  },

  achievementMiniCard: {
    minHeight: 94,
    padding: 12,
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    gap: 8
  },

  achievementMiniUnlocked: {
    background: "#ffffff"
  },

  achievementMiniLocked: {
    background: "#f8fafc",
    opacity: 0.72
  },

  achievementMiniSpecial: {
    background: "#fffbeb",
    border: "1px solid #fde68a"
  },

  achievementMiniIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    background: "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20
  },

  achievementMiniContent: {
    display: "flex",
    flexDirection: "column",
    gap: 3
  },

  analyticsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16
  },

  levelList: {
    display: "grid",
    gap: 14,
    marginTop: 16
  },

  levelRow: {
    display: "grid",
    gap: 8
  },

  levelTop: {
    display: "flex",
    justifyContent: "space-between",
    color: "#475569",
    fontSize: 13,
    fontWeight: 800
  },

  levelTrack: {
    height: 10,
    borderRadius: 999,
    background: "#e5e7eb",
    overflow: "hidden"
  },

  levelFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #378ADD, #1D9E75)"
  },

  categoryChart: {
    display: "grid",
    gap: 12,
    marginTop: 16
  },

  categoryRow: {
    display: "grid",
    gap: 7
  },

  categoryTop: {
    display: "flex",
    justifyContent: "space-between",
    color: "#475569",
    fontSize: 13,
    fontWeight: 800
  },

  categoryTrack: {
    height: 10,
    borderRadius: 999,
    background: "#e5e7eb",
    overflow: "hidden"
  },

  categoryFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #7F77DD, #378ADD)"
  },

  reportCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    background: "#111827",
    color: "#ffffff",
    borderRadius: 22,
    padding: 22,
    boxShadow: "0 16px 44px rgba(15,23,42,0.16)"
  },

  reportCardTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: 22
  },

  reportCardText: {
    margin: "8px 0 0",
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 1.6,
    maxWidth: 720
  },

  reportActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap"
  },

  primaryButton: {
    padding: "11px 15px",
    borderRadius: 12,
    border: "none",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 900,
    whiteSpace: "nowrap"
  },

  secondaryButton: {
    padding: "11px 15px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.25)",
    background: "transparent",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 900,
    whiteSpace: "nowrap"
  },

  printArea: {
    background: "#ffffff"
  },

  reportPreview: {
    background: "#ffffff",
    borderRadius: 20,
    padding: 24,
    border: "1px solid #e5e7eb",
    boxShadow: "0 10px 30px rgba(15,23,42,0.05)"
  },

  reportHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    marginBottom: 18
  },

  reportEyebrow: {
    color: "#4f46e5",
    fontSize: 11,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 1.2
  },

  reportTitle: {
    margin: "6px 0",
    color: "#111827",
    fontSize: 28
  },

  reportDate: {
    margin: 0,
    color: "#64748b"
  },

  reportBadge: {
    padding: "10px 14px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#4338ca",
    fontWeight: 900
  },

  reportGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12
  },

  reportBlock: {
    background: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    border: "1px solid #e5e7eb"
  },

  recommendationBox: {
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    background: "#ecfdf5",
    border: "1px solid #bbf7d0",
    color: "#166534"
  },

  emptyState: {
    minHeight: 100,
    borderRadius: 14,
    background: "#f8fafc",
    border: "1px dashed #cbd5e1",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 18,
    fontSize: 13,
    marginTop: 16
  }
};