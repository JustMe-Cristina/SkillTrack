import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import MesajFeedback from "../components/MesajFeedback";
import StareGoala from "../components/StareGoala";
import { apiFetch } from "../services/api";

const CATEGORY_LABELS = {
  DATA: "Data",
  BI: "BI",
  BUSINESS: "Business",
  PM: "PM",
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  FULLSTACK: "Full Stack",
  QA: "QA",
  AI_ML: "AI / ML"
};

const STATUS_LABELS = {
  SALVAT: "Salvat",
  APLICAT: "Aplicat",
  INTERVIU: "Interviu",
  OFERTA: "Ofertă",
  RESPINS: "Respins",
  FARA_RASPUNS: "Fără răspuns"
};

const MONTH_LABELS = [
  "Ian",
  "Feb",
  "Mar",
  "Apr",
  "Mai",
  "Iun",
  "Iul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

function normalizeArray(data, keys = []) {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return [];
}

function average(numbers) {
  const valid = numbers.map(Number).filter(Number.isFinite);

  if (valid.length === 0) return 0;

  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function formatDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function getDateKey(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getJobDate(job) {
  return job.updated_at || job.created_at || job.saved_at || null;
}

function getRoadmapDate(roadmap) {
  return roadmap.updated_at || roadmap.created_at || null;
}

function isCurrentMonth(value) {
  if (!value) return false;

  const date = new Date(value);
  const now = new Date();

  if (Number.isNaN(date.getTime())) return false;

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

function getRecentTime(value) {
  if (!value) return "-";

  const diffMs = Date.now() - new Date(value).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "Acum";
  if (diffHours < 24) return `Acum ${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays === 1) return "Ieri";

  return `Acum ${diffDays}z`;
}

function buildActivityMatrix(jobs, roadmaps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalDays = 98;
  const days = [];

  for (let i = totalDays - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    days.push({
      date,
      key: getDateKey(date),
      count: 0,
      activities: []
    });
  }

  const activitySources = [
    ...jobs.map((job) => ({
      date: getJobDate(job),
      label: `Job salvat/actualizat: ${job.title || "Job fără titlu"}`,
      type: "Job"
    })),
    ...roadmaps.map((roadmap) => ({
      date: getRoadmapDate(roadmap),
      label: `Plan actualizat: ${roadmap.title || "Plan de dezvoltare"}`,
      type: "Plan"
    }))
  ];

  activitySources.forEach((activity) => {
    const key = getDateKey(activity.date);
    const day = days.find((item) => item.key === key);

    if (day) {
      day.count += 1;
      day.activities.push(activity);
    }
  });

  const weeks = [];

  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const monthMarkers = weeks.map((week, index) => {
    const firstDay = week[0]?.date;
    const previousWeek = weeks[index - 1];
    const previousMonth = previousWeek?.[0]?.date?.getMonth();

    if (!firstDay) return "";

    const currentMonth = firstDay.getMonth();

    if (index === 0 || currentMonth !== previousMonth) {
      return MONTH_LABELS[currentMonth];
    }

    return "";
  });

  return { days, weeks, monthMarkers };
}

function calculateStreak(activityDays) {
  let streak = 0;

  for (let i = activityDays.length - 1; i >= 0; i -= 1) {
    if (activityDays[i].count > 0) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

function formatActiveDays(value) {
  if (value === 0) return "Nicio zi activă";
  if (value === 1) return "1 zi activă";
  return `${value} zile active`;
}

function getActivityStyle(count) {
  if (count >= 4) return styles.activityVeryHigh;
  if (count >= 3) return styles.activityHigh;
  if (count >= 2) return styles.activityMedium;
  if (count >= 1) return styles.activityLow;
  return styles.activityEmpty;
}

function getRoadmapNextStep(roadmaps) {
  const active = roadmaps.find(
    (roadmap) =>
      roadmap.status !== "COMPLETED" && Number(roadmap.progress || 0) < 100
  );

  if (active) {
    return {
      label: "Continuă planul",
      title: active.title || "Plan de dezvoltare",
      helper: `${active.progress || 0}% progres`,
      route: "/roadmaps"
    };
  }

  if (roadmaps.length > 0) {
    return {
      label: "Revizuiește progresul",
      title: "Ai planuri finalizate",
      helper: "Poți genera un plan nou pentru alt job.",
      route: "/roadmaps"
    };
  }

  return {
    label: "Începe dezvoltarea",
    title: "Generează primul plan de dezvoltare",
    helper: "Alege un job salvat și transformă competențele lipsă în pași.",
    route: "/roadmaps"
  };
}

function getCategory(job) {
  return job.ml_predicted_category || job.category || "NECLASIFICAT";
}

function countBy(items, getter) {
  const result = {};

  items.forEach((item) => {
    const key = getter(item) || "N/A";
    result[key] = (result[key] || 0) + 1;
  });

  return result;
}

function getScoreTone(score) {
  const value = Number(score || 0);

  if (value >= 75) {
    return {
      background: "#dcfce7",
      color: "#166534"
    };
  }

  if (value >= 45) {
    return {
      background: "#fef3c7",
      color: "#92400e"
    };
  }

  return {
    background: "#fee2e2",
    color: "#991b1b"
  };
}

function getMotivationalMessage(score) {
  if (score >= 75) {
    return "Profilul tău este competitiv pentru joburile urmărite.";
  }

  if (score >= 45) {
    return "Ești într-o zonă bună de creștere. Câteva competențe validate pot ridica semnificativ scorul.";
  }

  return "Ai spațiu mare de creștere. Începe cu un plan pentru competențele lipsă.";
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);
  const [userSkills, setUserSkills] = useState([]);
  const [market, setMarket] = useState(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [hoveredDay, setHoveredDay] = useState(null);
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setMessage("");

    try {
      const [jobsData, roadmapsData, skillsData, marketData] = await Promise.all(
        [
          apiFetch("/api/jobs").catch(() => null),
          apiFetch("/api/roadmaps").catch(() => null),
          apiFetch("/api/user-skills").catch(() => null),
          apiFetch("/api/analytics/market").catch(() => null)
        ]
      );

      setJobs(normalizeArray(jobsData, ["jobs", "data"]));
      setRoadmaps(normalizeArray(roadmapsData, ["roadmaps", "data"]));
      setUserSkills(normalizeArray(skillsData, ["skills", "userSkills", "data"]));
      setMarket(marketData);
    } catch (err) {
      console.error("LOAD DASHBOARD ERROR:", err);
      setMessage(err.message || "Nu s-au putut încărca datele dashboardului.");
    } finally {
      setLoading(false);
    }
  }

  const activity = useMemo(() => {
    return buildActivityMatrix(jobs, roadmaps);
  }, [jobs, roadmaps]);

  const stats = useMemo(() => {
    const avgScore = average(jobs.map((job) => job.match_score));

    const bestMatch =
      [...jobs].sort(
        (a, b) => Number(b.match_score || 0) - Number(a.match_score || 0)
      )[0] || null;

    const activeRoadmaps = roadmaps.filter(
      (roadmap) =>
        roadmap.status !== "COMPLETED" && Number(roadmap.progress || 0) < 100
    );

    const completedRoadmaps = roadmaps.filter(
      (roadmap) =>
        roadmap.status === "COMPLETED" || Number(roadmap.progress || 0) === 100
    );

    const avgRoadmapProgress = average(
      roadmaps.map((roadmap) => roadmap.progress)
    );

    const newSkillsThisMonth = userSkills.filter((skill) =>
      isCurrentMonth(skill.updated_at || skill.created_at)
    ).length;

    return {
      avgScore,
      bestMatch,
      activeRoadmaps,
      completedRoadmaps,
      avgRoadmapProgress,
      streak: calculateStreak(activity.days),
      newSkillsThisMonth
    };
  }, [jobs, roadmaps, userSkills, activity.days]);

  useEffect(() => {
    let current = 0;
    const target = Number(stats.avgScore || 0);

    setAnimatedScore(0);

    const interval = setInterval(() => {
      current += 2;

      if (current >= target) {
        setAnimatedScore(target);
        clearInterval(interval);
      } else {
        setAnimatedScore(current);
      }
    }, 18);

    return () => clearInterval(interval);
  }, [stats.avgScore]);

  const nextAction = useMemo(() => getRoadmapNextStep(roadmaps), [roadmaps]);
  const bestNextSkill = market?.bestNextSkill || null;

  const categoryDistribution = useMemo(() => {
    const counts = countBy(jobs, getCategory);

    return Object.entries(counts)
      .filter(([category]) => category !== "NECLASIFICAT")
      .map(([category, total]) => ({
        category,
        label: CATEGORY_LABELS[category] || category,
        total
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [jobs]);

  const recentItems = useMemo(() => {
    const jobItems = jobs.map((job) => ({
      type: "Job salvat",
      title: job.title || "Job fără titlu",
      subtitle: job.company || "Companie necunoscută",
      date: getJobDate(job),
      route: `/joburi-urmarite/${job.id}`,
      badge: `${job.match_score || 0}%`
    }));

    const roadmapItems = roadmaps.map((roadmap) => ({
      type: "Plan actualizat",
      title: roadmap.title || "Plan de dezvoltare",
      subtitle: `${roadmap.progress || 0}% progres`,
      date: getRoadmapDate(roadmap),
      route: "/roadmaps",
      badge: roadmap.status === "COMPLETED" ? "Finalizat" : "Activ"
    }));

    return [...jobItems, ...roadmapItems]
      .filter((item) => item.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 4);
  }, [jobs, roadmaps]);

  return (
    <AppLayout
      title="Dashboard"
      subtitle="Monitorizează progresul, joburile urmărite și următorul pas recomandat."
    >
      <div style={styles.page}>
        <div style={styles.pageActions}>
          <div style={styles.datePill}>
            {new Date().toLocaleDateString("ro-RO", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric"
            })}
          </div>

        </div>

        {message && <MesajFeedback message={message} type="error" />}

        {loading ? (
          <div style={styles.card}>
            <div style={styles.muted}>Se încarcă dashboardul...</div>
          </div>
        ) : (
          <>
            <section style={styles.heroCard}>
              <div style={styles.heroContent}>
                <div style={styles.eyebrow}>SkillTrack Career Hub</div>

                <h2 style={styles.heroTitle}>
                  Bună, Cristina. Hai să creștem scorul tău de carieră.
                </h2>

                <p style={styles.heroText}>
                  {getMotivationalMessage(stats.avgScore)}
                </p>

                <div style={styles.heroActions}>
                  <button
                    type="button"
                    style={styles.primaryButton}
                    onClick={() => navigate(nextAction.route)}
                  >
                    {nextAction.label}
                  </button>

                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => navigate("/analiza")}
                  >
                    Analizează job nou
                  </button>
                </div>
              </div>

              <div style={styles.heroScorePanel}>
                <div
                  style={{
                    ...styles.circularScore,
                    background: `conic-gradient(#4f46e5 ${
                      animatedScore * 3.6
                    }deg, #e5e7eb 0deg)`
                  }}
                >
                  <div style={styles.circularScoreInner}>
                    <strong>{animatedScore}%</strong>
                    <span>scor mediu</span>
                  </div>
                </div>

                <div style={styles.activeDaysPill}>
                  <span>🔥</span>
                  <strong>{formatActiveDays(stats.streak)}</strong>
                </div>
              </div>
            </section>

            <section style={styles.quickStats}>
              <StatCard
                label="Joburi urmărite"
                value={jobs.length}
                helper="salvate după analiză"
              />

              <StatCard
                label="Progres planuri"
                value={`${stats.avgRoadmapProgress}%`}
                helper={`${stats.completedRoadmaps.length} finalizate`}
              />

              <StatCard
                label="Planuri active"
                value={stats.activeRoadmaps.length}
                helper="în dezvoltare"
              />

              <StatCard
                label="Competențe noi"
                value={stats.newSkillsThisMonth}
                helper="adăugate luna aceasta"
              />
            </section>

            <section style={styles.dashboardGrid}>
              <div style={styles.leftArea}>
                <section style={styles.activityCard}>
                  <div style={styles.activityHeader}>
                    <div>
                      <div style={styles.sectionLabel}>Activitate</div>
                      <h3 style={styles.sectionTitle}>Ritmul tău de lucru</h3>
                      <p style={styles.sectionSubtitle}>
                        Activitatea recentă în SkillTrack.
                      </p>
                    </div>
                  </div>

                  <div style={styles.heatmapOuter}>
                    <div style={styles.monthLabels}>
                      <div />
                      {activity.monthMarkers.map((month, index) => (
                        <span key={`${month}-${index}`}>{month}</span>
                      ))}
                    </div>

                    <div style={styles.githubWrap}>
                      <div style={styles.weekdayLabels}>
                        <span>L</span>
                        <span>M</span>
                        <span>M</span>
                        <span>J</span>
                        <span>V</span>
                        <span>S</span>
                        <span>D</span>
                      </div>

                      <div style={styles.githubGrid}>
                        {activity.weeks.map((week, weekIndex) => (
                          <div key={weekIndex} style={styles.githubWeek}>
                            {week.map((day) => (
                              <div
                                key={day.key}
                                style={styles.githubCellWrap}
                                onMouseEnter={() => setHoveredDay(day)}
                                onMouseLeave={() => setHoveredDay(null)}
                              >
                                <div
                                  style={{
                                    ...styles.githubCell,
                                    ...getActivityStyle(day.count)
                                  }}
                                />

                                {hoveredDay?.key === day.key && (
                                  <div style={styles.githubTooltip}>
                                    <strong>{formatDate(day.date)}</strong>

                                    {day.count === 0 ? (
                                      <span>Nu există activitate.</span>
                                    ) : (
                                      <>
                                        <span>
                                          {day.count} activitate/activități
                                        </span>

                                        <ul style={styles.tooltipList}>
                                          {day.activities
                                            .slice(0, 4)
                                            .map((activityItem, index) => (
                                              <li
                                                key={`${activityItem.type}-${index}`}
                                              >
                                                {activityItem.label}
                                              </li>
                                            ))}
                                        </ul>

                                        {day.activities.length > 4 && (
                                          <span>
                                            +{day.activities.length - 4} alte
                                            activități
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={styles.activityFooter}>
                      <span>Mai puțin</span>
                      <span
                        style={{ ...styles.legendDot, ...styles.activityEmpty }}
                      />
                      <span
                        style={{ ...styles.legendDot, ...styles.activityLow }}
                      />
                      <span
                        style={{ ...styles.legendDot, ...styles.activityMedium }}
                      />
                      <span
                        style={{ ...styles.legendDot, ...styles.activityHigh }}
                      />
                      <span
                        style={{
                          ...styles.legendDot,
                          ...styles.activityVeryHigh
                        }}
                      />
                      <span>Mai mult</span>
                    </div>
                  </div>
                </section>

                <section style={styles.focusCard}>
                  <div>
                    <div style={styles.sectionLabelLight}>Următoarea acțiune</div>
                    <h3 style={styles.focusTitle}>{nextAction.title}</h3>
                    <p style={styles.focusText}>{nextAction.helper}</p>
                  </div>

                  <button
                    type="button"
                    style={styles.focusButton}
                    onClick={() => navigate(nextAction.route)}
                  >
                    Continuă
                  </button>
                </section>

                <section style={styles.card}>
                  <div style={styles.sectionHeader}>
                    <div>
                      <div style={styles.sectionLabel}>Focus skill</div>
                      <h3 style={styles.sectionTitle}>Cel mai important gap</h3>
                    </div>
                  </div>

                  {bestNextSkill ? (
                    <div style={styles.focusSkillBox}>
                      <strong>{bestNextSkill.name}</strong>
                      <span>{bestNextSkill.category || "Categorie generală"}</span>

                      <p>
                        Acest skill poate crește scorul mediu cu aproximativ{" "}
                        <b>+{bestNextSkill.avgGain}%</b> și apare în{" "}
                        <b>{bestNextSkill.jobsAffected}</b> joburi urmărite.
                      </p>

                      <button
                        type="button"
                        style={styles.smallButtonDark}
                        onClick={() => navigate("/analytics")}
                      >
                        Vezi detalii în Analytics
                      </button>
                    </div>
                  ) : (
                    <StareGoala
                      title="Nu există încă focus skill"
                      message="Salvează mai multe joburi pentru a calcula skillul prioritar."
                    />
                  )}
                </section>

                <section style={styles.card}>
                  <div style={styles.sectionHeader}>
                    <div>
                      <div style={styles.sectionLabel}>Piață</div>
                      <h3 style={styles.sectionTitle}>Categorii joburi</h3>
                    </div>
                  </div>

                  {categoryDistribution.length > 0 ? (
                    <div style={styles.categoryListWide}>
                      {categoryDistribution.map((item) => {
                        const max = Math.max(
                          ...categoryDistribution.map((entry) => entry.total),
                          1
                        );

                        const width = Math.round((item.total / max) * 100);

                        return (
                          <div key={item.category} style={styles.categoryRow}>
                            <div style={styles.categoryName}>{item.label}</div>

                            <div style={styles.categoryTrack}>
                              <div
                                style={{
                                  ...styles.categoryFill,
                                  width: `${width}%`
                                }}
                              />
                            </div>

                            <strong>{item.total}</strong>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <StareGoala
                      title="Nu există distribuție încă"
                      message="Salvează câteva joburi pentru a vedea categoriile dominante."
                    />
                  )}
                </section>
              </div>

              <div style={styles.rightArea}>
                <section style={styles.card}>
                  <div style={styles.sectionLabel}>Cel mai bun match</div>

                  {stats.bestMatch ? (
                    <button
                      type="button"
                      style={styles.bestMatchCard}
                      onClick={() =>
                        navigate(`/joburi-urmarite/${stats.bestMatch.id}`)
                      }
                    >
                      <div style={styles.bestMatchContent}>
                        <strong>{stats.bestMatch.title}</strong>
                        <p>{stats.bestMatch.company || "Companie necunoscută"}</p>

                        <span>
                          {STATUS_LABELS[stats.bestMatch.status] ||
                            stats.bestMatch.status ||
                            "Salvat"}
                        </span>
                      </div>

                      <div
                        style={{
                          ...styles.bestScore,
                          ...getScoreTone(stats.bestMatch.match_score)
                        }}
                      >
                        {stats.bestMatch.match_score || 0}%
                      </div>
                    </button>
                  ) : (
                    <StareGoala
                      title="Nu ai joburi salvate"
                      message="Analizează primul job pentru a vedea cel mai bun match."
                      actionLabel="Analizează job"
                      onAction={() => navigate("/analiza")}
                    />
                  )}
                </section>

                <section style={styles.card}>
                  <div style={styles.sectionLabel}>Activitate recentă</div>

                  {recentItems.length > 0 ? (
                    <div style={styles.recentList}>
                      {recentItems.map((item, index) => (
                        <button
                          key={`${item.type}-${index}`}
                          type="button"
                          style={styles.recentItem}
                          onClick={() => navigate(item.route)}
                        >
                          <div style={styles.recentContent}>
                            <span>{item.type}</span>
                            <strong>{item.title}</strong>
                            <p>{item.subtitle}</p>
                          </div>

                          <small>{getRecentTime(item.date)}</small>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <StareGoala
                      title="Nu există activitate recentă"
                      message="Joburile salvate și planurile actualizate vor apărea aici."
                    />
                  )}
                </section>
              </div>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function StatCard({ label, value, helper }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statHelper}>{helper}</div>
    </div>
  );
}

const styles = {
  page: {
    display: "grid",
    gap: 16,
    paddingBottom: 24
  },

  pageActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap"
  },

  datePill: {
    padding: "10px 14px",
    borderRadius: 999,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    color: "#64748b",
    fontSize: 13,
    fontWeight: 800,
    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)"
  },

  reloadButton: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    cursor: "pointer",
    fontWeight: 800
  },

  muted: {
    color: "#9ca3af",
    fontSize: 14
  },

  card: {
    background: "#ffffff",
    borderRadius: 22,
    padding: 20,
    border: "1px solid #e5e7eb",
    boxShadow: "0 12px 34px rgba(15, 23, 42, 0.055)"
  },

  heroCard: {
    display: "grid",
    gridTemplateColumns: "1fr 300px",
    gap: 24,
    padding: 28,
    borderRadius: 28,
    background:
      "radial-gradient(circle at top left, #eef2ff 0, #ffffff 46%, #f8fafc 100%)",
    border: "1px solid #dbeafe",
    boxShadow: "0 22px 60px rgba(15,23,42,0.09)"
  },

  heroContent: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center"
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: 900,
    color: "#4f46e5",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 8
  },

  heroTitle: {
    margin: 0,
    fontSize: 38,
    lineHeight: 1.08,
    color: "#111827",
    letterSpacing: "-0.06em",
    maxWidth: 780
  },

  heroText: {
    margin: "14px 0 0",
    color: "#64748b",
    fontSize: 15,
    lineHeight: 1.7,
    maxWidth: 760
  },

  heroActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 22
  },

  heroScorePanel: {
    display: "grid",
    placeItems: "center",
    gap: 16
  },

  circularScore: {
    width: 178,
    height: 178,
    borderRadius: "50%",
    padding: 12,
    boxShadow: "0 18px 42px rgba(79, 70, 229, 0.18)",
    transition: "background 0.3s ease"
  },

  circularScoreInner: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background: "#ffffff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "inset 0 0 0 1px #e5e7eb"
  },

  activeDaysPill: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 999,
    background: "#fff7ed",
    color: "#9a3412",
    border: "1px solid #fed7aa",
    fontSize: 13
  },

  quickStats: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12
  },

  statCard: {
    background: "#ffffff",
    borderRadius: 20,
    padding: 17,
    border: "1px solid #e5e7eb",
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.055)"
  },

  statLabel: {
    fontSize: 11,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1.1,
    fontWeight: 900
  },

  statValue: {
    marginTop: 8,
    fontSize: 32,
    color: "#111827",
    fontWeight: 900
  },

  statHelper: {
    marginTop: 4,
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 1.4
  },

  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 360px",
    gap: 16,
    alignItems: "start"
  },

  leftArea: {
    display: "grid",
    gap: 16
  },

  rightArea: {
    display: "grid",
    gap: 16
  },

  activityCard: {
    background: "#ffffff",
    borderRadius: 24,
    padding: 22,
    border: "1px solid #e5e7eb",
    boxShadow: "0 12px 34px rgba(15, 23, 42, 0.055)",
    overflowX: "auto"
  },

  activityHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14
  },

  sectionLabel: {
    fontSize: 11,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: 900,
    marginBottom: 6
  },

  sectionLabelLight: {
    fontSize: 11,
    color: "#cbd5e1",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: 900,
    marginBottom: 6
  },

  sectionTitle: {
    margin: 0,
    color: "#111827",
    fontSize: 21,
    letterSpacing: "-0.025em"
  },

  sectionSubtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.5
  },

  heatmapOuter: {
    width: "fit-content",
    maxWidth: "100%",
    overflowX: "auto"
  },

  monthLabels: {
    display: "grid",
    gridTemplateColumns: "24px repeat(14, 20px)",
    gap: 4,
    color: "#64748b",
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 6
  },

  githubWrap: {
    display: "grid",
    gridTemplateColumns: "24px 1fr",
    gap: 8,
    alignItems: "start"
  },

  weekdayLabels: {
    display: "grid",
    gridTemplateRows: "repeat(7, 14px)",
    gap: 4,
    color: "#64748b",
    fontSize: 10,
    lineHeight: "14px"
  },

  githubGrid: {
    display: "flex",
    gap: 4
  },

  githubWeek: {
    display: "grid",
    gridTemplateRows: "repeat(7, 14px)",
    gap: 4
  },

  githubCellWrap: {
    position: "relative",
    width: 14,
    height: 14
  },

  githubCell: {
    width: 14,
    height: 14,
    borderRadius: 3,
    border: "1px solid rgba(27,31,36,0.06)"
  },

  githubTooltip: {
    position: "absolute",
    bottom: "22px",
    left: "50%",
    transform: "translateX(-50%)",
    width: 250,
    padding: "10px 12px",
    borderRadius: 12,
    background: "#111827",
    color: "#ffffff",
    fontSize: 11,
    lineHeight: 1.45,
    boxShadow: "0 14px 30px rgba(15,23,42,0.22)",
    zIndex: 100,
    pointerEvents: "none",
    display: "grid",
    gap: 5
  },

  tooltipList: {
    margin: "6px 0 0",
    paddingLeft: 16
  },

  activityEmpty: {
    background: "#ebedf0"
  },

  activityLow: {
    background: "#9be9a8"
  },

  activityMedium: {
    background: "#40c463"
  },

  activityHigh: {
    background: "#30a14e"
  },

  activityVeryHigh: {
    background: "#216e39"
  },

  activityFooter: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
    color: "#94a3b8",
    fontSize: 11
  },

  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3
  },

  focusCard: {
    background: "#111827",
    color: "#ffffff",
    borderRadius: 24,
    padding: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    boxShadow: "0 18px 45px rgba(15,23,42,0.14)"
  },

  focusTitle: {
    margin: 0,
    fontSize: 22,
    letterSpacing: "-0.03em"
  },

  focusText: {
    margin: "8px 0 0",
    color: "#cbd5e1",
    lineHeight: 1.6,
    fontSize: 14
  },

  focusButton: {
    padding: "11px 15px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.25)",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 900,
    whiteSpace: "nowrap"
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 14
  },

  primaryButton: {
    padding: "11px 15px",
    borderRadius: 12,
    border: "none",
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 900,
    whiteSpace: "nowrap"
  },

  secondaryButton: {
    padding: "11px 15px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 900,
    whiteSpace: "nowrap"
  },

  smallButtonDark: {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 12,
    border: "none",
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 800
  },

  focusSkillBox: {
    display: "grid",
    gap: 6,
    padding: 16,
    borderRadius: 16,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    color: "#475569",
    lineHeight: 1.55
  },

  bestMatchCard: {
    width: "100%",
    border: "none",
    textAlign: "left",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    background: "#f8fafc",
    cursor: "pointer"
  },

  bestMatchContent: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    minWidth: 0
  },

  bestScore: {
    minWidth: 58,
    height: 58,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    flexShrink: 0
  },

  recentList: {
    display: "grid",
    gap: 10
  },

  recentItem: {
    width: "100%",
    border: "none",
    background: "#ffffff",
    borderBottom: "1px solid #f1f5f9",
    padding: "10px 0",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    textAlign: "left",
    cursor: "pointer"
  },

  recentContent: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    minWidth: 0
  },

  categoryListWide: {
    display: "grid",
    gap: 12
  },

  categoryRow: {
    display: "grid",
    gridTemplateColumns: "140px 1fr 32px",
    gap: 10,
    alignItems: "center"
  },

  categoryName: {
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
    background: "linear-gradient(90deg, #378ADD, #1D9E75)"
  }
};