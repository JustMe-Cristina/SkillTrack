import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import AppLayout from "../components/AppLayout";
import MesajFeedback from "../components/MesajFeedback";
import StareGoala from "../components/StareGoala";
import { apiFetch } from "../services/api";

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatPercent(value) {
  return `${toNumber(value)}%`;
}

function normalizeLabel(value) {
  if (!value) return "Nespecificat";

  const labels = {
    REMOTE: "Remote",
    HYBRID: "Hibrid",
    ONSITE: "La birou",
    INTERNSHIP: "Internship",
    JUNIOR: "Junior",
    MID: "Mid",
    SENIOR: "Senior",
    LOW: "Redusă",
    MEDIUM: "Medie",
    HIGH: "Ridicată",
    AI_ML: "AI / ML",
    BACKEND: "Backend",
    FRONTEND: "Frontend",
    FULLSTACK: "Full-stack",
    DATA: "Data",
    BI: "BI",
    BUSINESS: "Business",
    PM: "Project Management",
    QA: "QA",
  };

  return labels[value] || String(value).replaceAll("_", " ");
}

function getScoreColor(score) {
  const value = toNumber(score);

  if (value >= 75) return "#16a34a";
  if (value >= 45) return "#f59e0b";
  return "#dc2626";
}

function getScoreText(score) {
  const value = toNumber(score);

  if (value >= 75) return "compatibilitate ridicată";
  if (value >= 45) return "compatibilitate medie";
  return "compatibilitate redusă";
}

function StatCard({ label, value, helper }) {
  return (
    <section style={styles.statCard}>
      <p style={styles.statLabel}>{label}</p>
      <strong style={styles.statValue}>{value}</strong>
      {helper ? <span style={styles.statHelper}>{helper}</span> : null}
    </section>
  );
}

function Section({ title, description, children }) {
  return (
    <section style={styles.card}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>{title}</h2>
          {description ? <p style={styles.sectionDescription}>{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function ProgressBar({ value }) {
  const safeValue = Math.max(0, Math.min(100, toNumber(value)));

  return (
    <div style={styles.progressOuter}>
      <div
        style={{
          ...styles.progressInner,
          width: `${safeValue}%`,
          background: getScoreColor(safeValue),
        }}
      />
    </div>
  );
}

function ScoreLegend() {
  return (
    <div style={styles.legendBox}>
      <strong style={styles.legendTitle}>Interpretarea scorului de compatibilitate</strong>
      <div style={styles.legendGrid}>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: "#16a34a" }} />
          Ridicată: 75–100%
        </span>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: "#f59e0b" }} />
          Medie: 45–74%
        </span>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: "#dc2626" }} />
          Redusă: 0–44%
        </span>
      </div>
    </div>
  );
}

function EmptyAnalytics({ navigate }) {
  return (
    <StareGoala
      title="Nu există date pentru analiză"
      message="Analizează și salvează cel puțin un job pentru a vedea statistici despre piață, skilluri cerute și compatibilitatea profilului."
      actionLabel="Analizează un job"
      onAction={() => navigate("/analiza")}
    />
  );
}

export default function Analytics() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState(null);
  const [categories, setCategories] = useState([]);
  const [workModes, setWorkModes] = useState([]);
  const [topSkills, setTopSkills] = useState([]);
  const [market, setMarket] = useState(null);
  const [profileMarket, setProfileMarket] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadAnalytics() {
      setLoading(true);
      setError("");

      try {
        const [
          overviewData,
          categoriesData,
          workModesData,
          topSkillsData,
          marketData,
          profileMarketData,
        ] = await Promise.all([
          apiFetch("/api/analytics/overview"),
          apiFetch("/api/analytics/job-categories"),
          apiFetch("/api/analytics/work-modes"),
          apiFetch("/api/analytics/top-skills?limit=10"),
          apiFetch("/api/analytics/market"),
          apiFetch("/api/analytics/profile-vs-market"),
        ]);

        if (!active) return;

        setOverview(overviewData.overview || null);
        setCategories(categoriesData.categories || []);
        setWorkModes(workModesData.workModes || []);
        setTopSkills(topSkillsData.topSkills || []);
        setMarket(marketData || null);
        setProfileMarket(profileMarketData || null);
      } catch (err) {
        if (!active) return;
        setError(err.message || "Nu am putut încărca datele de analytics.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAnalytics();

    return () => {
      active = false;
    };
  }, []);

  const totalJobs = toNumber(overview?.totalJobs || market?.totalJobs);
  const avgScore = toNumber(overview?.avgMatchScore || market?.avgScore);
  const hasData = totalJobs > 0;

  const categoryChartData = useMemo(
    () =>
      categories.map((item) => ({
        name: normalizeLabel(item.category),
        total: toNumber(item.total),
        scor: toNumber(item.avgMatchScore),
      })),
    [categories]
  );

  const workModeChartData = useMemo(
    () =>
      workModes.map((item) => ({
        name: normalizeLabel(item.workMode),
        total: toNumber(item.total),
        scor: toNumber(item.avgMatchScore),
      })),
    [workModes]
  );

  const matchDistribution = useMemo(() => {
    const distribution = market?.distribution || { high: 0, medium: 0, low: 0 };

    return [
      { name: "Ridicată", value: toNumber(distribution.high), color: "#16a34a" },
      { name: "Medie", value: toNumber(distribution.medium), color: "#f59e0b" },
      { name: "Redusă", value: toNumber(distribution.low), color: "#dc2626" },
    ].filter((item) => item.value > 0);
  }, [market]);

  const profileCategories = profileMarket?.categories || [];

  return (
    <AppLayout
      title="Analytics"
      subtitle="Sinteză clară a joburilor analizate, a skillurilor cerute și a compatibilității profilului tău."
    >
      <MesajFeedback message={error} type="error" />

      {loading ? (
        <div style={styles.loading}>Se încarcă datele de analytics...</div>
      ) : !hasData ? (
        <EmptyAnalytics navigate={navigate} />
      ) : (
        <div style={styles.pageGrid}>
          <div style={styles.statsGrid}>
            <StatCard
              label="Joburi analizate"
              value={totalJobs}
              helper="total joburi salvate în aplicație"
            />
            <StatCard
              label="Scor mediu"
              value={formatPercent(avgScore)}
              helper={getScoreText(avgScore)}
            />
            <StatCard
              label="Cel mai bun scor"
              value={formatPercent(overview?.maxMatchScore)}
              helper={overview?.bestJob?.title || "job cu potrivirea cea mai mare"}
            />
            <StatCard
              label="Skilluri cerute"
              value={toNumber(overview?.totalRequiredSkills)}
              helper="skilluri distincte din joburile analizate"
            />
          </div>

          <div style={styles.twoColumns}>
            <Section
              title="Distribuția compatibilității"
              description="Împarte joburile în potrivire ridicată, medie și redusă."
            >
              {matchDistribution.length === 0 ? (
                <StareGoala title="Fără scoruri" message="Joburile nu au încă scoruri calculate." />
              ) : (
                <>
                  <div style={styles.chartBox}>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={matchDistribution}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={90}
                          label
                        >
                          {matchDistribution.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ScoreLegend />
                </>
              )}
            </Section>

            
          </div>

          <div style={styles.twoColumns}>
            <Section
              title="Top skilluri cerute"
              description="Skillurile care apar cel mai des în joburile salvate."
            >
              {topSkills.length === 0 ? (
                <StareGoala title="Fără skilluri" message="Nu există skilluri asociate joburilor analizate." />
              ) : (
                <div style={styles.list}>
                  {topSkills.map((skill, index) => (
                    <div key={skill.id || skill.name} style={styles.skillRow}>
                      <div style={styles.rank}>{index + 1}</div>
                      <div style={styles.rowContent}>
                        <strong style={styles.rowTitle}>{skill.name}</strong>
                        <span style={styles.rowMeta}>{normalizeLabel(skill.category)}</span>
                      </div>
                      <span style={styles.badge}>{toNumber(skill.demandCount)} apariții</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section
              title="Următorul skill recomandat"
              description="Calcul simplu: skillul care poate crește compatibilitatea pentru cele mai multe joburi."
            >
              {market?.bestNextSkill ? (
                <div style={styles.recommendationBox}>
                  <span style={styles.recommendationLabel}>Prioritate</span>
                  <h3 style={styles.recommendationTitle}>{market.bestNextSkill.name}</h3>
                  <p style={styles.recommendationText}>
                    Afectează {toNumber(market.bestNextSkill.jobsAffected)} joburi și poate crește scorul mediu cu aproximativ {formatPercent(market.bestNextSkill.avgGain)} pentru joburile relevante.
                  </p>
                  <span style={styles.categoryPill}>{normalizeLabel(market.bestNextSkill.category)}</span>
                </div>
              ) : (
                <StareGoala
                  title="Nu există skill lipsă major"
                  message="Profilul acoperă bine skillurile detectate în joburile salvate."
                />
              )}
            </Section>
          </div>

          <Section
            title="Profil vs. cerințele pieței"
            description="Comparație între competențele tale și skillurile cerute în joburile urmărite."
          >
            {profileCategories.length === 0 ? (
              <StareGoala title="Fără comparație" message="Nu există suficiente date pentru comparație." />
            ) : (
              <div style={styles.coverageGrid}>
                {profileCategories.slice(0, 6).map((category) => (
                  <article key={category.category} style={styles.coverageCard}>
                    <div style={styles.coverageHeader}>
                      <strong>{normalizeLabel(category.category)}</strong>
                      <span>{formatPercent(category.coveragePercent)}</span>
                    </div>
                    <ProgressBar value={category.coveragePercent} />
                    <p style={styles.coverageText}>
                      {toNumber(category.coveredRequired)} din {toNumber(category.marketNeeds)} skilluri cerute sunt acoperite.
                    </p>
                    {category.missingSkills?.length > 0 ? (
                      <p style={styles.missingText}>
                        Lipsesc: {category.missingSkills.slice(0, 4).join(", ")}
                        {category.missingSkills.length > 4 ? "..." : ""}
                      </p>
                    ) : (
                      <p style={styles.okText}>Acoperire completă pentru această categorie.</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Mod de lucru"
            description="Distribuția joburilor după remote, hibrid sau birou."
          >
            {workModeChartData.length === 0 ? (
              <StareGoala title="Fără date" message="Nu există informații despre modul de lucru." />
            ) : (
              <div style={styles.chartBoxSmall}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={workModeChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="total" name="Joburi" fill="#0f766e" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>
        </div>
      )}
    </AppLayout>
  );
}

const styles = {
  loading: {
    padding: 28,
    borderRadius: 18,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    color: "#64748b",
    fontWeight: 800,
  },

  pageGrid: {
    display: "grid",
    gap: 18,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 14,
  },

  statCard: {
    borderRadius: 20,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    padding: 18,
    boxShadow: "0 10px 26px rgba(15, 23, 42, 0.06)",
  },

  statLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: 13,
    fontWeight: 800,
  },

  statValue: {
    display: "block",
    marginTop: 8,
    color: "#111827",
    fontSize: 30,
    lineHeight: 1,
    letterSpacing: "-0.04em",
  },

  statHelper: {
    display: "block",
    marginTop: 8,
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.4,
  },

  twoColumns: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 18,
  },

  card: {
    borderRadius: 22,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    padding: 20,
    boxShadow: "0 10px 26px rgba(15, 23, 42, 0.06)",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 16,
  },

  sectionTitle: {
    margin: 0,
    color: "#111827",
    fontSize: 19,
    letterSpacing: "-0.02em",
  },

  sectionDescription: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.5,
  },

  chartBox: {
    width: "100%",
    height: 270,
  },

  chartBoxSmall: {
    width: "100%",
    height: 230,
  },

  legendBox: {
    marginTop: 10,
    padding: 14,
    borderRadius: 16,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },

  legendTitle: {
    display: "block",
    marginBottom: 10,
    color: "#111827",
    fontSize: 13,
  },

  legendGrid: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },

  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    color: "#475569",
    fontSize: 13,
    fontWeight: 700,
  },

  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    flex: "0 0 auto",
  },

  list: {
    display: "grid",
    gap: 10,
  },

  skillRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },

  rank: {
    width: 32,
    height: 32,
    borderRadius: 10,
    background: "#e0e7ff",
    color: "#3730a3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    flex: "0 0 auto",
  },

  rowContent: {
    minWidth: 0,
    flex: 1,
  },

  rowTitle: {
    display: "block",
    color: "#111827",
    fontSize: 14,
  },

  rowMeta: {
    display: "block",
    color: "#64748b",
    fontSize: 12,
    marginTop: 3,
  },

  badge: {
    borderRadius: 999,
    background: "#ecfdf5",
    color: "#166534",
    padding: "6px 9px",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  recommendationBox: {
    borderRadius: 18,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    padding: 18,
  },

  recommendationLabel: {
    display: "inline-flex",
    borderRadius: 999,
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 900,
  },

  recommendationTitle: {
    margin: "12px 0 8px",
    color: "#111827",
    fontSize: 26,
    letterSpacing: "-0.04em",
  },

  recommendationText: {
    margin: 0,
    color: "#475569",
    lineHeight: 1.6,
    fontSize: 14,
  },

  categoryPill: {
    display: "inline-flex",
    marginTop: 14,
    borderRadius: 999,
    background: "#eef2ff",
    color: "#3730a3",
    padding: "7px 10px",
    fontSize: 12,
    fontWeight: 900,
  },

  coverageGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 14,
  },

  coverageCard: {
    borderRadius: 18,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    padding: 16,
  },

  coverageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    color: "#111827",
    fontSize: 14,
  },

  progressOuter: {
    width: "100%",
    height: 9,
    marginTop: 12,
    borderRadius: 999,
    background: "#e5e7eb",
    overflow: "hidden",
  },

  progressInner: {
    height: "100%",
    borderRadius: 999,
  },

  coverageText: {
    margin: "12px 0 0",
    color: "#475569",
    fontSize: 13,
    lineHeight: 1.5,
  },

  missingText: {
    margin: "8px 0 0",
    color: "#991b1b",
    fontSize: 13,
    lineHeight: 1.5,
    fontWeight: 700,
  },

  okText: {
    margin: "8px 0 0",
    color: "#166534",
    fontSize: 13,
    lineHeight: 1.5,
    fontWeight: 700,
  },
};
