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
  AI_ML: "AI / ML",
};

const STATUS_LABELS = {
  SALVAT: "Salvat",
  APLICAT: "Aplicat",
  INTERVIU: "Interviu",
  OFERTA: "Ofertă",
  RESPINS: "Respins",
  FARA_RASPUNS: "Fără răspuns",
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
  "Dec",
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

  return Math.round(
    valid.reduce((sum, value) => sum + value, 0) / valid.length,
  );
}

function formatDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
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

function getMonday(date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);

  return result;
}

function buildActivityMatrix(jobs, roadmaps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const numberOfWeeks = 12;
  const endDate = getMonday(today);
  endDate.setDate(endDate.getDate() + 6);

  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - numberOfWeeks * 7 + 1);

  const days = [];

  for (let i = 0; i < numberOfWeeks * 7; i += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    days.push({
      date,
      key: getDateKey(date),
      count: 0,
      activities: [],
      isFuture: date > today,
    });
  }

  const activitySources = [
    ...jobs.map((job) => ({
      date: getJobDate(job),
      label: `Job salvat/actualizat: ${job.title || "Job fără titlu"}`,
      type: "Job",
    })),
    ...roadmaps.map((roadmap) => ({
      date: getRoadmapDate(roadmap),
      label: `Plan actualizat: ${roadmap.title || "Plan de dezvoltare"}`,
      type: "Plan",
    })),
  ];

  activitySources.forEach((activity) => {
    const key = getDateKey(activity.date);
    const day = days.find((item) => item.key === key);

    if (day && !day.isFuture) {
      day.count += 1;
      day.activities.push(activity);
    }
  });

  const weeks = [];

  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const monthMarkers = weeks.map((week, index) => {
    const firstVisibleDay = week.find((day) => !day.isFuture)?.date;
    const previousWeek = weeks[index - 1];
    const previousVisibleDay = previousWeek?.find((day) => !day.isFuture)?.date;

    if (!firstVisibleDay) return "";

    const currentMonth = firstVisibleDay.getMonth();
    const previousMonth = previousVisibleDay?.getMonth();

    if (index === 0 || currentMonth !== previousMonth) {
      return MONTH_LABELS[currentMonth];
    }

    return "";
  });

  return { days, weeks, monthMarkers };
}

function calculateStreak(activityDays) {
  const validDays = activityDays.filter((day) => !day.isFuture);
  let streak = 0;

  for (let i = validDays.length - 1; i >= 0; i -= 1) {
    if (validDays[i].count > 0) {
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

function getActivityStyle(count, isFuture = false) {
  if (isFuture) return styles.activityFuture;
  if (count >= 4) return styles.activityVeryHigh;
  if (count >= 3) return styles.activityHigh;
  if (count >= 2) return styles.activityMedium;
  if (count >= 1) return styles.activityLow;
  return styles.activityEmpty;
}

function getRoadmapNextStep(roadmaps) {
  const active = roadmaps.find(
    (roadmap) =>
      roadmap.status !== "COMPLETED" && Number(roadmap.progress || 0) < 100,
  );

  if (active) {
    return {
      label: "Continuă planul",
      title: active.title || "Plan de dezvoltare",
      helper: `${active.progress || 0}% progres`,
      route: "/roadmaps",
    };
  }

  if (roadmaps.length > 0) {
    return {
      label: "Revizuiește progresul",
      title: "Ai planuri finalizate",
      helper: "Poți genera un plan nou pentru alt job.",
      route: "/roadmaps",
    };
  }

  return {
    label: "Începe dezvoltarea",
    title: "Generează primul plan de dezvoltare",
    helper: "Alege un job salvat și transformă competențele lipsă în pași.",
    route: "/roadmaps",
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
      color: "#166534",
    };
  }

  if (value >= 45) {
    return {
      background: "#fef3c7",
      color: "#92400e",
    };
  }

  return {
    background: "#fee2e2",
    color: "#991b1b",
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
  const [hoveredStat, setHoveredStat] = useState(null);
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setMessage("");

    try {
      const [jobsData, roadmapsData, skillsData, marketData] =
        await Promise.all([
          apiFetch("/api/jobs").catch(() => null),
          apiFetch("/api/roadmaps").catch(() => null),
          apiFetch("/api/user-skills").catch(() => null),
          apiFetch("/api/analytics/market").catch(() => null),
        ]);

      setJobs(normalizeArray(jobsData, ["jobs", "data"]));
      setRoadmaps(normalizeArray(roadmapsData, ["roadmaps", "data"]));
      setUserSkills(
        normalizeArray(skillsData, ["skills", "userSkills", "data"]),
      );
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
        (a, b) => Number(b.match_score || 0) - Number(a.match_score || 0),
      )[0] || null;

    const activeRoadmaps = roadmaps.filter(
      (roadmap) =>
        roadmap.status !== "COMPLETED" && Number(roadmap.progress || 0) < 100,
    );

    const completedRoadmaps = roadmaps.filter(
      (roadmap) =>
        roadmap.status === "COMPLETED" || Number(roadmap.progress || 0) === 100,
    );

    const avgRoadmapProgress = average(
      roadmaps.map((roadmap) => roadmap.progress),
    );

    const newSkillsThisMonth = userSkills.filter((skill) =>
      isCurrentMonth(skill.updated_at || skill.created_at),
    ).length;

    return {
      avgScore,
      bestMatch,
      activeRoadmaps,
      completedRoadmaps,
      avgRoadmapProgress,
      streak: calculateStreak(activity.days),
      newSkillsThisMonth,
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
        total,
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
      badge: `${job.match_score || 0}%`,
    }));

    const roadmapItems = roadmaps.map((roadmap) => ({
      type: "Plan actualizat",
      title: roadmap.title || "Plan de dezvoltare",
      subtitle: `${roadmap.progress || 0}% progres`,
      date: getRoadmapDate(roadmap),
      route: "/roadmaps",
      badge: roadmap.status === "COMPLETED" ? "Finalizat" : "Activ",
    }));

    return [...jobItems, ...roadmapItems]
      .filter((item) => item.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 4);
  }, [jobs, roadmaps]);

  const statCards = [
    {
      label: "Joburi urmărite",
      value: jobs.length,
      helper: "salvate după analiză",
      route: "/joburi-urmarite",
    },
    {
      label: "Progres planuri",
      value: `${stats.avgRoadmapProgress}%`,
      helper: `${stats.completedRoadmaps.length} finalizate`,
      route: "/roadmaps",
    },
    {
      label: "Planuri active",
      value: stats.activeRoadmaps.length,
      helper: "în dezvoltare",
      route: "/roadmaps",
    },
    {
      label: "Competențe noi",
      value: stats.newSkillsThisMonth,
      helper: "adăugate luna aceasta",
      route: "/competentele-mele",
    },
  ];

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
              year: "numeric",
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
                    }deg, #e5e7eb 0deg)`,
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
              {statCards.map((stat) => (
                <StatCard
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  helper={stat.helper}
                  isHovered={hoveredStat === stat.label}
                  onMouseEnter={() => setHoveredStat(stat.label)}
                  onMouseLeave={() => setHoveredStat(null)}
                  onClick={() => navigate(stat.route)}
                />
              ))}
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
                      <span />
                      <div style={styles.monthGrid}>
                        {activity.monthMarkers.map((label, index) => (
                          <span key={`${label}-${index}`}>{label}</span>
                        ))}
                      </div>
                    </div>

                    <div style={styles.githubWrap}>
                      <div style={styles.weekdayLabels}>
                        <span>L</span>
                        <span />
                        <span>M</span>
                        <span />
                        <span>V</span>
                        <span />
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
                                    ...getActivityStyle(
                                      day.count,
                                      day.isFuture,
                                    ),
                                  }}
                                />

                                {hoveredDay?.key === day.key && (
                                  <div style={styles.githubTooltip}>
                                    <strong>{formatDate(day.date)}</strong>

                                    {day.isFuture ? (
                                      <span>Zi viitoare.</span>
                                    ) : day.count === 0 ? (
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
                        style={{
                          ...styles.legendDot,
                          ...styles.activityMedium,
                        }}
                      />
                      <span
                        style={{ ...styles.legendDot, ...styles.activityHigh }}
                      />
                      <span
                        style={{
                          ...styles.legendDot,
                          ...styles.activityVeryHigh,
                        }}
                      />
                      <span>Mai mult</span>
                    </div>
                  </div>
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
                          1,
                        );

                        const width = Math.round((item.total / max) * 100);

                        return (
                          <div key={item.category} style={styles.categoryRow}>
                            <div style={styles.categoryName}>{item.label}</div>

                            <div style={styles.categoryTrack}>
                              <div
                                style={{
                                  ...styles.categoryFill,
                                  width: `${width}%`,
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

                <section style={styles.focusCard}>
                  <div>
                    <div style={styles.sectionLabelLight}>
                      Următoarea acțiune
                    </div>
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
              </div>

              <div style={styles.rightArea}>
                <section style={styles.card}>
                  <div style={styles.sectionLabel}>Cel mai bun match</div>

                  {stats.bestMatch ? (
                    <button
                      type="button"
                      style={{
                        ...styles.bestMatchCard,
                        ...(hoveredStat === "bestMatch"
                          ? styles.bestMatchCardHover
                          : {}),
                      }}
                      onMouseEnter={() => setHoveredStat("bestMatch")}
                      onMouseLeave={() => setHoveredStat(null)}
                      onClick={() =>
                        navigate(`/joburi-urmarite/${stats.bestMatch.id}`)
                      }
                    >
                      <div style={styles.bestMatchContent}>
                        <strong>{stats.bestMatch.title}</strong>
                        <p>{stats.bestMatch.company || "Companie necunoscută"}</p>

                        <span style={styles.statusText}>
                          {STATUS_LABELS[stats.bestMatch.status] ||
                            stats.bestMatch.status ||
                            "Salvat"}
                        </span>
                      </div>

                      <div
                        style={{
                          ...styles.bestScorePill,
                          ...getScoreTone(stats.bestMatch.match_score),
                        }}
                      >
                        {stats.bestMatch.match_score || 0}% match
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

                <section style={styles.gapCompactCard}>
                  <div style={styles.sectionLabel}>Cel mai important gap</div>

                  {bestNextSkill ? (
                    <div style={styles.gapCompactBox}>
                      <div style={styles.gapCompactTop}>
                        <strong>{bestNextSkill.name}</strong>
                        <span>{bestNextSkill.category || "General"}</span>
                      </div>

                      <div style={styles.gapCompactMetric}>
                        +{bestNextSkill.avgGain}% impact estimat
                      </div>

                      <p>
                        Afectează <b>{bestNextSkill.jobsAffected}</b> joburi
                        urmărite.
                      </p>
                    </div>
                  ) : (
                    <StareGoala
                      title="Nu există încă focus skill"
                      message="Salvează mai multe joburi pentru a calcula skillul prioritar."
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

function StatCard({
  label,
  value,
  helper,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) {
  return (
    <button
      type="button"
      style={{
        ...styles.statCard,
        ...(isHovered ? styles.statCardHover : {}),
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statHelper}>{helper}</div>
    </button>
  );
}

const styles = {
  page: {
    display: "grid",
    gap: 16,
    paddingBottom: 24,
  },

  pageActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },

  datePill: {
    padding: "10px 14px",
    borderRadius: 999,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    color: "#64748b",
    fontSize: 13,
    fontWeight: 800,
    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
  },

  muted: {
    color: "#9ca3af",
    fontSize: 14,
  },

  card: {
    background: "#ffffff",
    borderRadius: 20,
    padding: 18,
    border: "1px solid #e5e7eb",
    boxShadow: "0 12px 34px rgba(15, 23, 42, 0.055)",
  },

  heroCard: {
    display: "grid",
    gridTemplateColumns: "1fr 240px",
    gap: 18,
    padding: "20px 22px",
    borderRadius: 22,
    background:
      "radial-gradient(circle at top left, #eef2ff 0, #ffffff 46%, #f8fafc 100%)",
    border: "1px solid #dbeafe",
    boxShadow: "0 22px 60px rgba(15,23,42,0.09)",
  },

  heroContent: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: 900,
    color: "#4f46e5",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 8,
  },

  heroTitle: {
    margin: 0,
    fontSize: 30,
    lineHeight: 1.1,
    color: "#111827",
    letterSpacing: "-0.06em",
    maxWidth: 780,
  },

  heroText: {
    margin: "10px 0 0",
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.55,
    maxWidth: 760,
  },

  heroActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 16,
  },

  heroScorePanel: {
    display: "grid",
    placeItems: "center",
    gap: 10,
  },

  circularScore: {
    width: 132,
    height: 132,
    borderRadius: "50%",
    padding: 12,
    boxShadow: "0 18px 42px rgba(79, 70, 229, 0.18)",
    transition: "background 0.3s ease",
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
    boxShadow: "inset 0 0 0 1px #e5e7eb",
  },

  activeDaysPill: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "8px 11px",
    borderRadius: 999,
    background: "#fff7ed",
    color: "#9a3412",
    border: "1px solid #fed7aa",
    fontSize: 13,
  },

  quickStats: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
  },

  statCard: {
    width: "100%",
    background: "#ffffff",
    borderRadius: 16,
    padding: "12px 14px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.055)",
    textAlign: "left",
    cursor: "pointer",
    transition:
      "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
    fontFamily: "inherit",
  },

  statCardHover: {
    transform: "translateY(-3px) scale(1.02)",
    borderColor: "#4f46e5",
    boxShadow: "0 18px 42px rgba(79, 70, 229, 0.16)",
  },

  statLabel: {
    fontSize: 11,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1.1,
    fontWeight: 900,
  },

  statValue: {
    marginTop: 5,
    fontSize: 26,
    color: "#111827",
    fontWeight: 900,
  },

  statHelper: {
    marginTop: 2,
    color: "#94a3b8",
    fontSize: 11,
    lineHeight: 1.4,
  },

  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 360px",
    gap: 16,
    alignItems: "start",
  },

  leftArea: {
    display: "grid",
    gap: 16,
  },

  rightArea: {
    display: "grid",
    gap: 16,
  },

  activityCard: {
    background: "#ffffff",
    borderRadius: 20,
    padding: 18,
    border: "1px solid #e5e7eb",
    boxShadow: "0 12px 34px rgba(15, 23, 42, 0.055)",
    overflowX: "auto",
  },

  activityHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },

  sectionLabel: {
    fontSize: 11,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: 900,
    marginBottom: 6,
  },

  sectionLabelLight: {
    fontSize: 11,
    color: "#cbd5e1",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: 900,
    marginBottom: 6,
  },

  sectionTitle: {
    margin: 0,
    color: "#111827",
    fontSize: 18,
    letterSpacing: "-0.025em",
  },

  sectionSubtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.5,
  },

  heatmapOuter: {
    width: "fit-content",
    maxWidth: "100%",
    overflowX: "auto",
    paddingTop: 2,
  },

  monthLabels: {
    display: "grid",
    gridTemplateColumns: "24px 1fr",
    gap: 8,
    marginBottom: 5,
  },

  monthGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(12, 16px)",
    gap: 4,
    minWidth: "fit-content",
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: 800,
    lineHeight: "12px",
  },

  githubWrap: {
    display: "grid",
    gridTemplateColumns: "24px 1fr",
    gap: 8,
    alignItems: "start",
  },

  weekdayLabels: {
    display: "grid",
    gridTemplateRows: "repeat(7, 16px)",
    gap: 4,
    color: "#64748b",
    fontSize: 10,
    fontWeight: 800,
    lineHeight: "16px",
    textAlign: "center",
  },

  githubGrid: {
    display: "flex",
    gap: 4,
  },

  githubWeek: {
    display: "grid",
    gridTemplateRows: "repeat(7, 16px)",
    gap: 4,
  },

  githubCellWrap: {
    position: "relative",
    width: 16,
    height: 16,
  },

  githubCell: {
    width: 16,
    height: 16,
    borderRadius: 4,
    border: "1px solid rgba(27,31,36,0.06)",
    boxSizing: "border-box",
    transition: "transform 0.12s ease, box-shadow 0.12s ease",
  },

  githubTooltip: {
    position: "absolute",
    bottom: "26px",
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
    gap: 5,
  },

  tooltipList: {
    margin: "6px 0 0",
    paddingLeft: 16,
  },

  activityEmpty: {
    background: "#ebedf0",
  },

  activityFuture: {
    background: "#f8fafc",
    opacity: 0.45,
  },

  activityLow: {
    background: "#9be9a8",
  },

  activityMedium: {
    background: "#40c463",
  },

  activityHigh: {
    background: "#30a14e",
  },

  activityVeryHigh: {
    background: "#216e39",
  },

  activityFooter: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
    paddingLeft: 32,
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: 800,
  },

  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
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
    boxShadow: "0 18px 45px rgba(15,23,42,0.14)",
  },

  focusTitle: {
    margin: 0,
    fontSize: 22,
    letterSpacing: "-0.03em",
  },

  focusText: {
    margin: "8px 0 0",
    color: "#cbd5e1",
    lineHeight: 1.6,
    fontSize: 14,
  },

  focusButton: {
    padding: "11px 15px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.25)",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },

  primaryButton: {
    padding: "11px 15px",
    borderRadius: 12,
    border: "none",
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  secondaryButton: {
    padding: "11px 15px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  gapCompactCard: {
    background: "#ffffff",
    borderRadius: 18,
    padding: 16,
    border: "1px solid #e5e7eb",
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.05)",
  },

  gapCompactBox: {
    display: "grid",
    gap: 7,
    padding: 12,
    borderRadius: 14,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    color: "#475569",
    lineHeight: 1.45,
    fontSize: 13,
  },

  gapCompactTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },

  gapCompactMetric: {
    padding: "7px 9px",
    borderRadius: 10,
    background: "#eef2ff",
    color: "#3730a3",
    fontSize: 12,
    fontWeight: 900,
  },

  bestMatchCard: {
    width: "100%",
    textAlign: "left",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    gap: 12,
    padding: "13px 14px",
    borderRadius: 16,
    background: "#f8fafc",
    cursor: "pointer",
    transition: "all 0.2s ease",
    border: "1px solid rgba(148,163,184,0.16)",
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.04)",
  },

  bestMatchCardHover: {
    transform: "translateY(-3px) scale(1.01)",
    borderColor: "#4f46e5",
    boxShadow: "0 18px 42px rgba(79, 70, 229, 0.16)",
  },

  bestMatchContent: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
  },

  statusText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
  },

  bestScorePill: {
    minWidth: 82,
    padding: "8px 10px",
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 12,
    flexShrink: 0,
    whiteSpace: "nowrap",
  },

  recentList: {
    display: "grid",
    gap: 6,
  },

  recentItem: {
    width: "100%",
    border: "none",
    background: "#ffffff",
    borderBottom: "1px solid #f1f5f9",
    padding: "8px 0",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    gap: 10,
    textAlign: "left",
    cursor: "pointer",
  },

  recentContent: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  },

  categoryListWide: {
    display: "grid",
    gap: 12,
  },

  categoryRow: {
    display: "grid",
    gridTemplateColumns: "140px 1fr 32px",
    gap: 10,
    alignItems: "center",
  },

  categoryName: {
    color: "#475569",
    fontSize: 13,
    fontWeight: 800,
  },

  categoryTrack: {
    height: 10,
    borderRadius: 999,
    background: "#e5e7eb",
    overflow: "hidden",
  },

  categoryFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #378ADD, #1D9E75)",
  },
};
