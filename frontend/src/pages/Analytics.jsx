import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis
} from "recharts";

import AppLayout from "../components/AppLayout";
import { apiFetch } from "../services/api";
import MesajFeedback from "../components/MesajFeedback";

const CHART_COLORS = [
  "#378ADD",
  "#7F77DD",
  "#1D9E75",
  "#EF9F27",
  "#E05D5D",
  "#14B8A6",
  "#8B5CF6",
  "#F97316",
  "#64748B"
];

const COMPATIBILITY_LABELS = {
  high: "Compatibilitate mare",
  medium: "Compatibilitate medie",
  low: "Compatibilitate redusă"
};

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toPercent(value) {
  return `${Math.round(toNumber(value) * 100)}%`;
}

function truncate(text, max = 26) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function normalizeJobs(data) {
  if (Array.isArray(data?.jobs)) return data.jobs;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
}

function normalizeUserSkills(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.skills)) return data.skills;
  if (Array.isArray(data?.userSkills)) return data.userSkills;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getUserSkillId(skill) {
  return Number(skill.skillId ?? skill.skill_id ?? skill.id);
}

function normalizeJobDetails(results) {
  const map = new Map();

  results.forEach((result) => {
    if (result?.job?.id) {
      map.set(Number(result.job.id), result.job);
    }
  });

  return map;
}

export default function Analytics() {
  const [market, setMarket] = useState(null);
  const [profileVsMarket, setProfileVsMarket] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [jobDetailsMap, setJobDetailsMap] = useState(new Map());
  const [userSkillIds, setUserSkillIds] = useState(new Set());
  const [mlMetrics, setMlMetrics] = useState(null);
  const [showMlDetails, setShowMlDetails] = useState(false);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setLoading(true);
    setMessage("");

    try {
      const [marketData, profileData, jobsData, userSkillsData, mlData] =
        await Promise.all([
          apiFetch("/api/analytics/market"),
          apiFetch("/api/analytics/profile-vs-market"),
          apiFetch("/api/jobs"),
          apiFetch("/api/user-skills").catch(() => []),
          apiFetch("/api/ml/job-category/metrics").catch(() => ({
            metrics: null
          }))
        ]);

      const normalizedJobs = normalizeJobs(jobsData);
      const normalizedUserSkills = normalizeUserSkills(userSkillsData);

      const detailsResults = await Promise.all(
        normalizedJobs.map((job) =>
          apiFetch(`/api/jobs/${job.id}`).catch(() => null)
        )
      );

      setMarket(marketData);
      setProfileVsMarket(profileData);
      setJobs(normalizedJobs);
      setJobDetailsMap(normalizeJobDetails(detailsResults));
      setUserSkillIds(
        new Set(
          normalizedUserSkills
            .map((skill) => getUserSkillId(skill))
            .filter((id) => Number.isFinite(id))
        )
      );
      setMlMetrics(mlData.metrics || null);
    } catch (err) {
      console.error("ANALYTICS LOAD ERROR:", err);
      setMessage(err.message || "Nu s-au putut încărca datele analytics.");
    } finally {
      setLoading(false);
    }
  }

  const compatibilityData = useMemo(() => {
    const distribution = market?.distribution || {};

    return Object.entries(distribution).map(([key, value], index) => ({
      key,
      name: COMPATIBILITY_LABELS[key] || key,
      total: toNumber(value),
      fill: CHART_COLORS[index % CHART_COLORS.length]
    }));
  }, [market]);

  const skillImpactData = useMemo(() => {
    return (market?.skillsImpact || []).slice(0, 10).map((skill) => {
      const skillId = Number(skill.skillId ?? skill.id ?? skill.skill_id);

      const impactedJobs = jobs.filter((job) => {
        const details = jobDetailsMap.get(Number(job.id));
        const requiredSkills = details?.skills || [];

        const isRequired = requiredSkills.some((requiredSkill) => {
          const requiredSkillId = Number(
            requiredSkill.id ?? requiredSkill.skill_id ?? requiredSkill.skillId
          );

          if (Number.isFinite(skillId) && Number.isFinite(requiredSkillId)) {
            return requiredSkillId === skillId;
          }

          const requiredName = String(requiredSkill.name || "").toLowerCase();
          const skillName = String(skill.name || "").toLowerCase();

          return requiredName && skillName && requiredName === skillName;
        });

        const alreadyKnown = Number.isFinite(skillId)
          ? userSkillIds.has(skillId)
          : false;

        return isRequired && !alreadyKnown;
      });

      return {
        skillId,
        name: skill.name,
        impact: toNumber(skill.avgGain),
        jobsAffected: toNumber(skill.jobsAffected),
        category: skill.category,
        impactedJobs
      };
    });
  }, [market, jobs, jobDetailsMap, userSkillIds]);

  const profileCoverageData = useMemo(() => {
    return (profileVsMarket?.categories || []).slice(0, 8).map((category) => ({
      name: category.category,
      coverage: toNumber(category.coveragePercent),
      marketNeeds: toNumber(category.marketNeeds),
      coveredRequired: toNumber(category.coveredRequired)
    }));
  }, [profileVsMarket]);

  const topGapCategories = useMemo(() => {
    return (profileVsMarket?.categories || [])
      .filter((category) => category.missingSkills?.length > 0)
      .slice(0, 5);
  }, [profileVsMarket]);

  const testedModelsData = useMemo(() => {
    return (mlMetrics?.tested_models || []).map((model) => ({
      name: model.model,
      accuracy: toNumber(model.accuracy),
      macroF1: toNumber(model.macro_f1),
      cvMacroF1: toNumber(model.cv_macro_f1)
    }));
  }, [mlMetrics]);

  const bestModel = mlMetrics?.best_model || null;
  const bestNextSkill = market?.bestNextSkill || null;

  return (
    <AppLayout
      title="Analytics"
      subtitle="Analiză avansată a profilului tău în raport cu joburile salvate."
    >
      {message && <MesajFeedback message={message} type="error" />}

      {loading ? (
        <div style={styles.card}>
          <div style={styles.muted}>Se încarcă datele analytics...</div>
        </div>
      ) : (
        <>
          <div style={styles.heroCard}>
            <div>
              <div style={styles.heroEyebrow}>SkillTrack Intelligence</div>

              <h1 style={styles.heroTitle}>Analiză profil vs piață</h1>

              <p style={styles.heroText}>
                Vezi ce skilluri lipsesc cel mai des din profilul tău, ce
                categorii sunt prioritare și unde merită să îți concentrezi
                efortul pentru joburile salvate.
              </p>
            </div>

            <div style={styles.heroRecommendation}>
              <span>Skill recomandat </span>

              <strong>{bestNextSkill?.name || "-"}</strong>

              <p>
                {bestNextSkill
                  ? `Lipsește în ${bestNextSkill.jobsAffected} joburi urmărite și poate adăuga în medie +${bestNextSkill.avgGain} puncte la scorul de potrivire.`
                  : "Adaugă mai multe joburi salvate pentru o recomandare relevantă."}
              </p>
            </div>
          </div>

          <div style={styles.gridTwo}>
            <div style={styles.card}>
              <div style={styles.sectionHeader}>
                <div>
                  <div style={styles.sectionLabel}>Profil vs piață</div>
                  <h2 style={styles.sectionTitle}>Acoperire pe categorii</h2>
                </div>
              </div>

              <p style={styles.explainText}>
                Acoperirea arată cât din cererea de skilluri pentru o categorie
                este deja prezentă în profilul tău. 100% înseamnă că ai toate
                skillurile cerute în joburile salvate pentru acea categorie.
              </p>

              {profileCoverageData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={profileCoverageData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(value) => `${value}%`} />
                    <ChartTooltip
                      formatter={(value, name, props) => {
                        const payload = props?.payload || {};

                        return [
                          `${value}% (${payload.coveredRequired}/${payload.marketNeeds} skilluri)`,
                          "Acoperire"
                        ];
                      }}
                    />
                    <Bar
                      dataKey="coverage"
                      name="Acoperire"
                      radius={[8, 8, 0, 0]}
                    >
                      {profileCoverageData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="Nu există date pentru comparația profil vs piață." />
              )}
            </div>

            <div style={styles.card}>
              <div style={styles.sectionHeader}>
                <div>
                  <div style={styles.sectionLabel}>Gap analysis</div>
                  <h2 style={styles.sectionTitle}>Categorii prioritare</h2>
                </div>
              </div>

              <p style={styles.insightText}>
                {profileVsMarket?.insight ||
                  "Nu există încă o interpretare disponibilă."}
              </p>

              <div style={styles.gapList}>
                {topGapCategories.length > 0 ? (
                  topGapCategories.map((category) => (
                    <div key={category.category} style={styles.gapCard}>
                      <div style={styles.gapTop}>
                        <div>
                          <strong>{category.category} </strong>
                          <span>
                            {category.coveredRequired}/{category.marketNeeds}{" "}
                             skilluri acoperite 
                          </span>
                        </div>

                        <b>{category.coveragePercent}%</b>
                      </div>

                      <div style={styles.progressBar}>
                        <div
                          style={{
                            ...styles.progressFill,
                            width: `${category.coveragePercent}%`
                          }}
                        />
                      </div>

                      <div style={styles.skillChips}>
                        {(category.missingSkills || [])
                          .slice(0, 5)
                          .map((skill) => (
                            <span key={skill} style={styles.chip}>
                              {skill}
                            </span>
                          ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState message="Nu există gapuri prioritare." />
                )}
              </div>
            </div>
          </div>

          <div style={styles.gridTwo}>
            <div style={styles.card}>
              <div style={styles.sectionHeader}>
                <div>
                  <div style={styles.sectionLabel}>Skill impact</div>
                  <h2 style={styles.sectionTitle}>
                    Skilluri lipsă cu cel mai mare efect
                  </h2>
                </div>
              </div>

              <p style={styles.explainText}>
                Impactul este exprimat în puncte de scor, nu în procente
                statistice. Dacă Docker are +16, înseamnă că adăugarea lui ar
                putea crește scorul de potrivire cu aproximativ 16 puncte pentru
                joburile în care lipsește.
              </p>

              {skillImpactData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={skillImpactData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(value) => `+${value}`} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 12 }}
                    />
                    <ChartTooltip
                      formatter={(value, name, props) => {
                        const payload = props?.payload || {};

                        return [
                          `+${value} puncte · ${payload.jobsAffected} joburi`,
                          "Impact estimat"
                        ];
                      }}
                    />
                    <Bar
                      dataKey="impact"
                      name="Impact estimat"
                      radius={[0, 8, 8, 0]}
                    >
                      {skillImpactData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="Nu există skilluri lipsă cu impact calculat." />
              )}
            </div>

            <div style={styles.card}>
              <div style={styles.sectionHeader}>
                <div>
                  <div style={styles.sectionLabel}>Compatibilitate</div>
                  <h2 style={styles.sectionTitle}>Distribuția joburilor</h2>
                </div>
              </div>

              {compatibilityData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={compatibilityData}
                        dataKey="total"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                      >
                        {compatibilityData.map((entry) => (
                          <Cell key={entry.key} fill={entry.fill} />
                        ))}
                      </Pie>

                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>

                  <div style={styles.legendList}>
                    {compatibilityData.map((item) => (
                      <div key={item.key} style={styles.legendRow}>
                        <span
                          style={{
                            ...styles.colorDot,
                            background: item.fill
                          }}
                        />

                        <span style={styles.legendName}>{item.name}</span>

                        <strong>{item.total}</strong>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState message="Nu există joburi salvate pentru distribuție." />
              )}
            </div>
          </div>

          <div style={styles.cardLarge}>
            <div style={styles.sectionHeader}>
              <div>
                <div style={styles.sectionLabel}>Detalii skill impact</div>
                <h2 style={styles.sectionTitle}>
                  Unde contează fiecare skill lipsă
                </h2>
              </div>
            </div>

            <p style={styles.explainText}>
              Lista de mai jos arată câte joburi sunt afectate de fiecare skill
              lipsă și în ce joburi apare acel skill. Asta face recomandarea mai
              ușor de explicat la prezentare.
            </p>

            {skillImpactData.length > 0 ? (
              <div style={styles.skillImpactDetails}>
                {skillImpactData.slice(0, 6).map((skill) => (
                  <div
                    key={skill.skillId || skill.name}
                    style={styles.skillImpactCard}
                  >
                    <div style={styles.skillImpactTop}>
                      <div>
                        <strong>{skill.name} </strong>
                        <span>{skill.category || "Categorie nespecificată"}</span>
                      </div>

                      <div style={styles.impactPill}>+{skill.impact} puncte</div>
                    </div>

                    <div style={styles.skillImpactMeta}>
                      Lipsește în <b>{skill.jobsAffected}</b>{" "}
                      {skill.jobsAffected === 1
                        ? "job urmărit"
                        : "joburi urmărite"}
                      .
                    </div>

                    {skill.impactedJobs.length > 0 ? (
                      <div style={styles.jobChipList}>
                        {skill.impactedJobs.slice(0, 5).map((job) => (
                          <span key={job.id} style={styles.jobChip}>
                            {truncate(job.title, 32)}
                            {job.company
                              ? ` · ${truncate(job.company, 18)}`
                              : ""}
                          </span>
                        ))}

                        {skill.impactedJobs.length > 5 && (
                          <span style={styles.jobChip}>
                            +{skill.impactedJobs.length - 5} alte joburi
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={styles.smallText}>
                        Joburile exacte nu sunt disponibile pentru acest skill,
                        dar impactul agregat este calculat din joburile salvate.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="Nu există detalii de impact pentru skilluri." />
            )}
          </div>

          <div style={styles.cardLarge}>
            <div style={styles.dropdownHeader}>
              <div>
                <div style={styles.sectionLabel}>Detalii tehnice</div>
                <h2 style={styles.sectionTitle}>Model ML și evaluare</h2>
                <p style={styles.smallText}>
                  Secțiune tehnică pentru documentație: modelul folosit,
                  metricile de evaluare și interpretarea rezultatelor.
                </p>
              </div>

              <button
                type="button"
                style={styles.dropdownButton}
                onClick={() => setShowMlDetails((prev) => !prev)}
              >
                {showMlDetails ? "Ascunde detaliile" : "Vezi detaliile ML"}

                <span style={styles.dropdownArrow}>
                  {showMlDetails ? "↑" : "↓"}
                </span>
              </button>
            </div>

            {showMlDetails && (
              <>
                {mlMetrics && bestModel ? (
                  <>
                    <div style={styles.mlIntro}>
                      Modelul tratează analiza joburilor ca o problemă de{" "}
                      <strong>clasificare multiclasă</strong>. Scopul este
                      prezicerea categoriei profesionale a unui job pe baza
                      descrierii, skillurilor extrase și atributelor jobului.
                    </div>

                    <div style={styles.gridFour}>
                      <MetricCard
                        label="Problemă"
                        value="Multiclass"
                        helper={mlMetrics.target || "category"}
                        accent="#378ADD"
                      />

                      <MetricCard
                        label="Model ales"
                        value={bestModel.name || "-"}
                        helper="selectat după macro F1"
                        accent="#1D9E75"
                      />

                      <MetricCard
                        label="Accuracy"
                        value={toPercent(bestModel.accuracy)}
                        helper="performanță pe test"
                        accent="#7F77DD"
                      />

                      <MetricCard
                        label="Macro F1"
                        value={toPercent(bestModel.macro_f1)}
                        helper="metrică echilibrată pe clase"
                        accent="#EF9F27"
                      />
                    </div>

                    <div style={styles.mlSplitGrid}>
                      <MiniMetric
                        label="Dataset total"
                        value={mlMetrics.dataset_size}
                        helper="joburi etichetate"
                      />

                      <MiniMetric
                        label="Date antrenare"
                        value={mlMetrics.train_size}
                        helper="observații pentru antrenare"
                      />

                      <MiniMetric
                        label="Date testare"
                        value={mlMetrics.test_size}
                        helper="observații pentru evaluare finală"
                      />

                      <MiniMetric
                        label="CV Macro F1"
                        value={toPercent(bestModel.cv_macro_f1)}
                        helper="validare încrucișată"
                      />
                    </div>

                    <div style={styles.gridTwoNoMargin}>
                      <div style={styles.innerCard}>
                        <div style={styles.sectionLabel}>Modele testate</div>

                        {testedModelsData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={310}>
                            <BarChart data={testedModelsData}>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                              />
                              <XAxis
                                dataKey="name"
                                tick={{ fontSize: 11 }}
                                interval={0}
                                angle={-20}
                                textAnchor="end"
                                height={70}
                              />
                              <YAxis tickFormatter={(value) => `${value * 100}%`} />
                              <ChartTooltip
                                formatter={(value) =>
                                  `${Math.round(value * 100)}%`
                                }
                              />
                              <Bar
                                dataKey="accuracy"
                                name="Accuracy"
                                radius={[8, 8, 0, 0]}
                                fill="#378ADD"
                              />
                              <Bar
                                dataKey="macroF1"
                                name="Macro F1"
                                radius={[8, 8, 0, 0]}
                                fill="#1D9E75"
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <EmptyState message="Nu există modele testate salvate." />
                        )}
                      </div>

                      <div style={styles.innerCard}>
                        <div style={styles.sectionLabel}>
                          Interpretare rezultate
                        </div>

                        <div style={styles.mlExplanation}>
                          <p>
                            Cel mai bun model este{" "}
                            <strong>{bestModel.name}</strong>, cu accuracy de{" "}
                            <strong>{toPercent(bestModel.accuracy)}</strong> și
                            macro F1 de{" "}
                            <strong>{toPercent(bestModel.macro_f1)}</strong>.
                          </p>

                          <p>
                            Macro F1 este relevant deoarece datasetul conține mai
                            multe clase de joburi, iar unele categorii pot avea
                            mai puține exemple decât altele.
                          </p>

                          <p>
                            Împărțirea train/test folosește{" "}
                            <strong>{mlMetrics.train_size}</strong> exemple
                            pentru antrenare și{" "}
                            <strong>{mlMetrics.test_size}</strong> exemple
                            pentru testare, dintr-un total de{" "}
                            <strong>{mlMetrics.dataset_size}</strong> joburi.
                          </p>

                          <p style={styles.warningText}>
                            Predicțiile modelului sunt interpretate ca scoruri
                            relative, nu ca certitudini absolute.
                          </p>
                        </div>

                        <div style={styles.modelTable}>
                          {(mlMetrics.tested_models || []).map((model) => (
                            <div key={model.model} style={styles.modelRow}>
                              <strong>{model.model}</strong>
                              <span>Accuracy: {toPercent(model.accuracy)}</span>
                              <span>Macro F1: {toPercent(model.macro_f1)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <EmptyState message="Nu există încă metrici ML. Rulează scriptul train_job_category_model.py." />
                )}
              </>
            )}
          </div>
        </>
      )}
    </AppLayout>
  );
}

function MetricCard({ label, value, helper, accent }) {
  return (
    <div style={{ ...styles.metricCard, borderLeft: `3px solid ${accent}` }}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{value}</div>
      <div style={styles.metricSub}>{helper}</div>
    </div>
  );
}

function MiniMetric({ label, value, helper }) {
  return (
    <div style={styles.mlBox}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div style={styles.emptyState}>
      <span>{message}</span>
    </div>
  );
}

const styles = {
  muted: {
    color: "#9ca3af",
    fontSize: 14
  },

  heroCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "stretch",
    gap: 24,
    marginBottom: 16,
    padding: 24,
    borderRadius: 20,
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(239,246,255,0.98))",
    border: "1px solid #e0e7ff",
    boxShadow: "0 16px 45px rgba(15,23,42,0.08)"
  },

  heroEyebrow: {
    fontSize: 11,
    fontWeight: 800,
    color: "#4f46e5",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 8
  },

  heroTitle: {
    margin: 0,
    fontSize: 32,
    color: "#111827",
    letterSpacing: "-0.04em"
  },

  heroText: {
    margin: "10px 0 0",
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.7,
    maxWidth: 720
  },

  heroRecommendation: {
    minWidth: 290,
    maxWidth: 330,
    borderRadius: 18,
    background: "#111827",
    color: "white",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 6
  },

  gridFour: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 14,
    marginBottom: 16
  },

  gridTwo: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 16,
    marginBottom: 16,
    alignItems: "stretch"
  },

  gridTwoNoMargin: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 16,
    alignItems: "stretch"
  },

  card: {
    background: "white",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
    border: "1px solid #f1f5f9"
  },

  cardLarge: {
    background: "white",
    borderRadius: 18,
    padding: 22,
    boxShadow: "0 12px 36px rgba(0,0,0,0.07)",
    border: "1px solid #e0e7ff",
    marginBottom: 16
  },

  innerCard: {
    background: "#f8fafc",
    borderRadius: 16,
    padding: 18,
    border: "1px solid #e5e7eb"
  },

  metricCard: {
    background: "#f9fafb",
    borderRadius: 12,
    padding: "16px 18px",
    border: "1px solid #e5e7eb",
    overflow: "hidden"
  },

  metricLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1.2
  },

  metricValue: {
    fontSize: 26,
    fontWeight: 900,
    color: "#111827",
    marginTop: 8,
    lineHeight: 1.15,
    wordBreak: "break-word"
  },

  metricSub: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 6,
    lineHeight: 1.45
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 16
  },

  dropdownHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap"
  },

  dropdownButton: {
    border: "none",
    borderRadius: 14,
    padding: "11px 14px",
    fontSize: 14,
    fontWeight: 900,
    cursor: "pointer",
    background: "#111827",
    color: "#ffffff",
    display: "inline-flex",
    alignItems: "center",
    gap: 8
  },

  dropdownArrow: {
    width: 22,
    height: 22,
    borderRadius: 999,
    background: "rgba(255,255,255,0.14)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900
  },

  smallText: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.6
  },

  explainText: {
    margin: "0 0 14px",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.65
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8
  },

  sectionTitle: {
    margin: 0,
    color: "#111827",
    fontSize: 18,
    letterSpacing: "-0.02em"
  },

  mlIntro: {
    marginTop: 18,
    marginBottom: 16,
    padding: 16,
    borderRadius: 14,
    background: "#eef2ff",
    color: "#3730a3",
    lineHeight: 1.65,
    fontSize: 14
  },

  mlSplitGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 16
  },

  mlBox: {
    padding: 15,
    borderRadius: 14,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    gap: 6
  },

  mlExplanation: {
    color: "#475569",
    lineHeight: 1.65,
    fontSize: 14
  },

  warningText: {
    padding: 12,
    borderRadius: 12,
    background: "#fff7ed",
    color: "#9a3412",
    border: "1px solid #fed7aa"
  },

  modelTable: {
    display: "grid",
    gap: 8,
    marginTop: 14
  },

  modelRow: {
    display: "grid",
    gridTemplateColumns: "1.3fr 1fr 1fr",
    gap: 10,
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 12,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    fontSize: 12,
    color: "#475569"
  },

  legendList: {
    display: "grid",
    gap: 8,
    marginTop: 4
  },

  legendRow: {
    display: "grid",
    gridTemplateColumns: "14px 1fr auto",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    background: "#f8fafc",
    borderRadius: 10
  },

  colorDot: {
    width: 10,
    height: 10,
    borderRadius: "50%"
  },

  legendName: {
    fontSize: 13,
    color: "#475569"
  },

  insightText: {
    margin: "0 0 16px",
    color: "#475569",
    lineHeight: 1.7
  },

  gapList: {
    display: "grid",
    gap: 12
  },

  gapCard: {
    padding: 14,
    borderRadius: 14,
    background: "#f8fafc",
    border: "1px solid #e5e7eb"
  },

  gapTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10
  },

  progressBar: {
    height: 9,
    borderRadius: 999,
    background: "#e2e8f0",
    overflow: "hidden",
    marginBottom: 12
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #378ADD, #1D9E75)"
  },

  skillChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6
  },

  chip: {
    padding: "5px 8px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#4338ca",
    fontSize: 11,
    fontWeight: 700
  },

  skillImpactDetails: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 12,
    marginTop: 14
  },

  skillImpactCard: {
    padding: 15,
    borderRadius: 15,
    background: "#f8fafc",
    border: "1px solid #e5e7eb"
  },

  skillImpactTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 10
  },

  impactPill: {
    padding: "7px 9px",
    borderRadius: 999,
    background: "#ecfdf5",
    color: "#166534",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap"
  },

  skillImpactMeta: {
    color: "#475569",
    fontSize: 13,
    marginBottom: 10
  },

  jobChipList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6
  },

  jobChip: {
    padding: "6px 8px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#4338ca",
    fontSize: 11,
    fontWeight: 700
  },

  emptyState: {
    minHeight: 120,
    borderRadius: 14,
    background: "#f8fafc",
    border: "1px dashed #cbd5e1",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 18,
    fontSize: 13
  }
};
