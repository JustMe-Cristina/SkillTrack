import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import AppLayout from "../components/AppLayout";
import MesajFeedback from "../components/MesajFeedback";
import StareGoala from "../components/StareGoala";

function extractSkillName(skill) {
  if (typeof skill === "string") return skill;
  return skill.skill || skill.name || skill.skill_name || "";
}

function getScoreColor(score) {
  const value = Number(score || 0);
  if (value >= 75) return "#16a34a";
  if (value >= 45) return "#f59e0b";
  return "#dc2626";
}

function getScoreLabel(score) {
  const value = Number(score || 0);
  if (value >= 75) return "Potrivire ridicată";
  if (value >= 45) return "Potrivire medie";
  return "Potrivire redusă";
}

function normalizeProbability(value) {
  const number = Number(value || 0);
  return number <= 1 ? Math.round(number * 100) : Math.round(number);
}

export default function AnalizaJob() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const [analysis, setAnalysis] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  const [loadingAnalyze, setLoadingAnalyze] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);

  const [savedJobId, setSavedJobId] = useState(null);
  const [showNextActions, setShowNextActions] = useState(false);

  const [mlPrediction, setMlPrediction] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError, setMlError] = useState("");

  const [animatedScore, setAnimatedScore] = useState(0);

  const [showRequirementsPrompt, setShowRequirementsPrompt] = useState(false);
  const [requirementsAnswers, setRequirementsAnswers] = useState({
    meets_experience_requirement: null,
    meets_degree_requirement: null
  });

  useEffect(() => {
    if (!analysis) {
      setAnimatedScore(0);
      return;
    }

    let current = 0;
    const target = Number(analysis.score || 0);

    const interval = setInterval(() => {
      current += 2;

      if (current >= target) {
        setAnimatedScore(target);
        clearInterval(interval);
      } else {
        setAnimatedScore(current);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [analysis]);

  function showFeedback(text, type = "info") {
    setMessage(text);
    setMessageType(type);
  }

  function getDetectedSkillNames(jobAnalysis = analysis) {
    return (jobAnalysis?.detectedSkills || [])
      .map(extractSkillName)
      .filter(Boolean);
  }

  function getMatchSkillNames() {
    return (analysis?.matches || [])
      .map((item) => item.skill || item.name || item.skill_name)
      .filter(Boolean);
  }

  function getGapSkillNames() {
    return (analysis?.gaps || [])
      .map((item) => item.skill || item.name || item.skill_name)
      .filter(Boolean);
  }

  function buildScoreExplanation() {
    if (!analysis) return "";

    if (analysis.explanation) {
      return analysis.explanation;
    }

    const matches = getMatchSkillNames();
    const gaps = getGapSkillNames();
    const total = matches.length + gaps.length;

    if (total === 0) {
      return "Scorul este calculat pe baza competențelor detectate în descrierea jobului și a competențelor salvate în profilul tău.";
    }

    if (Number(analysis.score || 0) >= 75) {
      return `Ai acoperit ${matches.length} din ${total} competențe detectate. Profilul tău se potrivește foarte bine cu cerințele principale.`;
    }

    if (Number(analysis.score || 0) >= 45) {
      return `Ai acoperit ${matches.length} din ${total} competențe detectate. Ai o bază relevantă, dar competențele lipsă pot crește potrivirea.`;
    }

    return `Ai acoperit ${matches.length} din ${total} competențe detectate. Roadmap-ul te poate ajuta să transformi gapurile în pași concreți.`;
  }

  function buildMlExplanation() {
    if (!mlPrediction) return "";

    const topSkills = getDetectedSkillNames().slice(0, 5);

    if (topSkills.length > 0) {
      return `Categoria ${mlPrediction.predictedCategory} este susținută de termenii și competențele detectate în descriere, precum: ${topSkills.join(", ")}.`;
    }

    return `Categoria ${mlPrediction.predictedCategory} a fost estimată pe baza textului descrierii jobului și a atributelor extrase automat.`;
  }

  async function predictJobCategory(jobAnalysis) {
    setMlLoading(true);
    setMlError("");
    setMlPrediction(null);

    try {
      const payload = {
        title: jobAnalysis?.title || title.trim(),
        description: jobAnalysis?.description || description.trim(),
        skills: getDetectedSkillNames(jobAnalysis),
        technologies: [],
        work_mode: jobAnalysis?.work_mode || "UNKNOWN",
        employment_type: jobAnalysis?.employment_type || "UNKNOWN"
      };

      const data = await apiFetch("/api/ml/job-category/predict", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setMlPrediction(data.prediction || null);
    } catch (err) {
      console.error("ML PREDICTION ERROR:", err);
      setMlError(err.message || "Nu s-a putut calcula predicția ML pentru acest job.");
    } finally {
      setMlLoading(false);
    }
  }

  async function handleAnalyze(e) {
    e.preventDefault();

    setMessage("");
    setAnalysis(null);
    setMlPrediction(null);
    setMlError("");
    setShowNextActions(false);
    setSavedJobId(null);
    setShowRequirementsPrompt(false);
    setRequirementsAnswers({
      meets_experience_requirement: null,
      meets_degree_requirement: null
    });

    if (!title.trim() || !description.trim()) {
      showFeedback("Completează titlul și descrierea jobului.", "error");
      return;
    }

    try {
      setLoadingAnalyze(true);

      const data = await apiFetch("/api/jobs/analyze", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          company: company.trim(),
          location: location.trim(),
          description: description.trim()
        })
      });

      setAnalysis(data);
      await predictJobCategory(data);

      if (data.experience_label || data.degree_label) {
        setShowRequirementsPrompt(true);
      }

      showFeedback("Jobul a fost analizat cu succes.", "success");
    } catch (err) {
      console.error("JOB ANALYZE ERROR:", err);
      showFeedback(err.message || "Nu s-a putut analiza jobul.", "error");
    } finally {
      setLoadingAnalyze(false);
    }
  }

  function setRequirementAnswer(field, value) {
    setRequirementsAnswers((prev) => ({
      ...prev,
      [field]: value
    }));
  }

  function confirmRequirementsPrompt() {
    if (
      analysis?.experience_label &&
      requirementsAnswers.meets_experience_requirement === null
    ) {
      showFeedback("Confirmă dacă îndeplinești cerința de experiență.", "error");
      return;
    }

    if (
      analysis?.degree_label &&
      requirementsAnswers.meets_degree_requirement === null
    ) {
      showFeedback("Confirmă dacă îndeplinești cerința de studii.", "error");
      return;
    }

    setMessage("");
    setShowRequirementsPrompt(false);
  }

  async function handleSaveJob() {
    if (!analysis) return;

    if (analysis.experience_label || analysis.degree_label) {
      if (
        analysis.experience_label &&
        requirementsAnswers.meets_experience_requirement === null
      ) {
        setShowRequirementsPrompt(true);
        showFeedback("Confirmă mai întâi criteriul de experiență.", "error");
        return;
      }

      if (
        analysis.degree_label &&
        requirementsAnswers.meets_degree_requirement === null
      ) {
        setShowRequirementsPrompt(true);
        showFeedback("Confirmă mai întâi criteriul de studii.", "error");
        return;
      }
    }

    try {
      setLoadingSave(true);
      setMessage("");

      const data = await apiFetch("/api/jobs", {
        method: "POST",
        body: JSON.stringify({
          title: analysis.title,
          company: analysis.company,
          location: analysis.location,
          work_mode: analysis.work_mode,
          employment_type: analysis.employment_type,
          description: analysis.description,
          score: analysis.score,
          detectedSkills: analysis.detectedSkills || [],
          matches: analysis.matches || [],
          gaps: analysis.gaps || [],
          status: "SALVAT",

          experience_min: analysis.experience_min,
          experience_label: analysis.experience_label,
          degree_level: analysis.degree_level,
          degree_label: analysis.degree_label,
          meets_experience_requirement: analysis.experience_label
            ? requirementsAnswers.meets_experience_requirement
            : null,
          meets_degree_requirement: analysis.degree_label
            ? requirementsAnswers.meets_degree_requirement
            : null,

          ml_predicted_category: mlPrediction?.predictedCategory || null,
          ml_model: mlPrediction?.model || null,
          ml_confidence: mlPrediction?.probabilities?.[0]?.probability || null,
          ml_probabilities_json: mlPrediction?.probabilities || null
        })
      });

      setSavedJobId(data.jobId || data.id || null);
      setShowNextActions(true);
      showFeedback("Jobul a fost salvat cu succes.", "success");
    } catch (err) {
      console.error("JOB SAVE ERROR:", err);
      showFeedback(err.message || "Nu s-a putut salva jobul.", "error");
    } finally {
      setLoadingSave(false);
    }
  }

  function renderRequirementStatus(value) {
    if (value === true) return <span style={styles.requirementOk}>✓</span>;
    if (value === false) return <span style={styles.requirementMissing}>!</span>;
    return null;
  }

  function renderMlPrediction() {
    if (mlLoading) {
      return (
        <section style={styles.mlCard}>
          <div style={styles.mlLabel}>Machine Learning</div>
          <p style={styles.mlText}>Se calculează categoria jobului...</p>
        </section>
      );
    }

    if (mlError) {
      return (
        <section style={styles.mlError}>
          <strong>Predicție ML indisponibilă</strong>
          <p>{mlError}</p>
        </section>
      );
    }

    if (!mlPrediction) return null;

    return (
      <section style={styles.mlCard}>
        <div style={styles.mlHeader}>
          <div>
            <div style={styles.mlLabel}>Machine Learning</div>
            <h3 style={styles.mlTitle}>Clasificare automată job</h3>
          </div>

          <div style={styles.mlBadge}>{mlPrediction.predictedCategory}</div>
        </div>

        <p style={styles.mlText}>
          Modelul <strong>{mlPrediction.model || "ML"}</strong> a estimat că
          acest job aparține categoriei{" "}
          <strong>{mlPrediction.predictedCategory}</strong>.
        </p>

        <div style={styles.xaiBox}>
          <div style={styles.xaiLabel}>Explicație locală</div>
          <p>{buildMlExplanation()}</p>
        </div>

        <div style={styles.mlMetaGrid}>
          <div style={styles.mlMetaCard}>
            <span>Problemă</span>
            <strong>{mlPrediction.problemType || "multiclass_classification"}</strong>
          </div>

          <div style={styles.mlMetaCard}>
            <span>Target</span>
            <strong>{mlPrediction.target || "category"}</strong>
          </div>

          <div style={styles.mlMetaCard}>
            <span>Model</span>
            <strong>{mlPrediction.model || "Model ML"}</strong>
          </div>
        </div>

        {mlPrediction.probabilities?.length > 0 && (
          <div style={styles.probabilityList}>
            {mlPrediction.probabilities.slice(0, 5).map((item) => {
              const percent = normalizeProbability(item.probability);

              return (
                <div key={item.category} style={styles.probabilityRow}>
                  <span>{item.category}</span>

                  <div style={styles.probabilityBar}>
                    <div
                      style={{
                        ...styles.probabilityFill,
                        width: `${percent}%`
                      }}
                    />
                  </div>

                  <strong>{percent}%</strong>
                </div>
              );
            })}
          </div>
        )}

        <p style={styles.mlNote}>
          Probabilitățile sunt scoruri relative generate de model, nu certitudini absolute.
        </p>
      </section>
    );
  }

  return (
    <AppLayout
      title="Analiză job"
      subtitle="Analizează un job și vezi rapid gradul de potrivire cu profilul tău"
    >
      <div style={styles.page}>
        {message && <MesajFeedback message={message} type={messageType} />}

        <section style={styles.heroSectionSingle}>
          <div style={styles.eyebrow}>SkillTrack AI Analysis</div>

          <h1 style={styles.heroTitle}>
            Transformă descrierile de job în insight-uri clare.
          </h1>

          <p style={styles.heroText}>
            Detectează competențe, identifică gapuri, estimează categoria profesională
            și construiește roadmap-uri personalizate.
          </p>
        </section>

        <div style={styles.grid}>
          <section style={styles.card}>
            <div style={styles.sectionLabel}>Input</div>
            <h2 style={styles.sectionTitle}>Date job</h2>

            <form onSubmit={handleAnalyze} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Titlu job</label>
                <input
                  style={styles.input}
                  placeholder="Ex: Data Analyst Intern"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div style={styles.row}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Companie</label>
                  <input
                    style={styles.input}
                    placeholder="Ex: Bosch"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Locație</label>
                  <input
                    style={styles.input}
                    placeholder="Ex: Cluj-Napoca"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Descriere job</label>
                <textarea
                  style={styles.textarea}
                  placeholder="Introdu descrierea completă a jobului..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <button
                type="submit"
                style={styles.primaryButton}
                disabled={loadingAnalyze}
              >
                {loadingAnalyze ? "Se analizează..." : "Analizează jobul"}
              </button>
            </form>
          </section>

          <section style={styles.card}>
            <div style={styles.sectionLabel}>Rezultat</div>
            <h2 style={styles.sectionTitle}>Analiză AI</h2>

            {!analysis ? (
              <StareGoala
                title="Nu există analiză"
                message="Completează formularul și pornește analiza jobului."
              />
            ) : (
              <>
                <section style={styles.scoreSection}>
                  <div style={styles.scoreCircleWrap}>
                    <svg width="180" height="180">
                      <circle
                        cx="90"
                        cy="90"
                        r="74"
                        stroke="#e5e7eb"
                        strokeWidth="12"
                        fill="none"
                      />

                      <circle
                        cx="90"
                        cy="90"
                        r="74"
                        stroke={getScoreColor(animatedScore)}
                        strokeWidth="12"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={465}
                        strokeDashoffset={465 - (465 * animatedScore) / 100}
                        transform="rotate(-90 90 90)"
                        style={{ transition: "stroke-dashoffset 0.4s ease" }}
                      />
                    </svg>

                    <div style={styles.scoreCenter}>
                      <strong>{animatedScore}%</strong>
                      <span>{getScoreLabel(animatedScore)}</span>
                    </div>
                  </div>

                  <div style={styles.scoreContent}>
                    <div style={styles.scoreBadge}>
                      {getMatchSkillNames().length} /{" "}
                      {getMatchSkillNames().length + getGapSkillNames().length}{" "}
                      competențe acoperite
                    </div>

                    <h3 style={styles.scoreTitle}>
                      Scor de potrivire pentru acest job
                    </h3>

                    <p style={styles.scoreText}>{buildScoreExplanation()}</p>
                  </div>
                </section>

                <div style={styles.metaGrid}>
                  <InfoCard label="Locație" value={analysis.location || "-"} />
                  <InfoCard label="Mod de lucru" value={analysis.work_mode || "-"} />
                  <InfoCard
                    label="Tip angajare"
                    value={analysis.employment_type || "-"}
                  />

                  {analysis.experience_label && (
                    <div style={styles.metaCard}>
                      <span>Experiență</span>
                      <div style={styles.metaRow}>
                        <strong>{analysis.experience_label}</strong>
                        {renderRequirementStatus(
                          requirementsAnswers.meets_experience_requirement
                        )}
                      </div>
                    </div>
                  )}

                  {analysis.degree_label && (
                    <div style={styles.metaCard}>
                      <span>Studii</span>
                      <div style={styles.metaRow}>
                        <strong>{analysis.degree_label}</strong>
                        {renderRequirementStatus(
                          requirementsAnswers.meets_degree_requirement
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {renderMlPrediction()}

                <div style={styles.columns}>
                  <div style={styles.skillCard}>
                    <div style={styles.skillHeaderDanger}>
                      Competențe de dezvoltat
                    </div>

                    {analysis.gaps?.length > 0 ? (
                      <div style={styles.tags}>
                        {analysis.gaps.map((item) => (
                          <span key={item.skillId} style={styles.gapTag}>
                            {item.skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div style={styles.emptyText}>
                        Nu există competențe lipsă.
                      </div>
                    )}
                  </div>

                  <div style={styles.skillCard}>
                    <div style={styles.skillHeaderSuccess}>
                      Competențe acoperite
                    </div>

                    {analysis.matches?.length > 0 ? (
                      <div style={styles.tags}>
                        {analysis.matches.map((item) => (
                          <span key={item.skillId} style={styles.matchTag}>
                            {item.skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div style={styles.emptyText}>
                        Nu există competențe detectate.
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  style={styles.saveButton}
                  onClick={handleSaveJob}
                  disabled={loadingSave}
                >
                  {loadingSave ? "Se salvează..." : "Salvează jobul"}
                </button>

                {showNextActions && (
                  <section style={styles.nextSection}>
                    <h3 style={styles.nextTitle}>Ce vrei să faci mai departe?</h3>

                    <div style={styles.nextGrid}>
                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={() =>
                          savedJobId
                            ? navigate(`/joburi-urmarite/${savedJobId}`)
                            : navigate("/joburi-urmarite")
                        }
                      >
                        Joburi urmărite
                      </button>

                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={() => navigate("/roadmaps")}
                      >
                        Roadmaps
                      </button>

                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={() => navigate("/analytics")}
                      >
                        Analytics
                      </button>

                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={() => navigate("/competentele-mele")}
                      >
                        Competențele mele
                      </button>
                    </div>
                  </section>
                )}
              </>
            )}
          </section>
        </div>

        {showRequirementsPrompt && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalCard}>
              <div style={styles.modalHeader}>
                <div>
                  <div style={styles.modalEyebrow}>Confirmare criterii</div>
                  <h3 style={styles.modalTitle}>
                    Verificare experiență și studii
                  </h3>
                </div>

                <button
                  type="button"
                  style={styles.closeButton}
                  onClick={() => setShowRequirementsPrompt(false)}
                >
                  ✕
                </button>
              </div>

              <p style={styles.modalText}>
                Am detectat criterii suplimentare în descrierea jobului. Confirmă
                dacă profilul tău acoperă aceste cerințe.
              </p>

              {analysis?.experience_label && (
                <div style={styles.requirementBox}>
                  <strong>Experiență necesară: {analysis.experience_label}</strong>

                  <div style={styles.answerRow}>
                    <button
                      type="button"
                      style={
                        requirementsAnswers.meets_experience_requirement === true
                          ? styles.answerButtonYes
                          : styles.answerButton
                      }
                      onClick={() =>
                        setRequirementAnswer(
                          "meets_experience_requirement",
                          true
                        )
                      }
                    >
                      Da
                    </button>

                    <button
                      type="button"
                      style={
                        requirementsAnswers.meets_experience_requirement === false
                          ? styles.answerButtonNo
                          : styles.answerButton
                      }
                      onClick={() =>
                        setRequirementAnswer(
                          "meets_experience_requirement",
                          false
                        )
                      }
                    >
                      Nu
                    </button>
                  </div>
                </div>
              )}

              {analysis?.degree_label && (
                <div style={styles.requirementBox}>
                  <strong>Studii necesare: {analysis.degree_label}</strong>

                  <p style={styles.requirementHint}>
                    Dacă jobul cere masterat sau licență, confirmă dacă ai sau urmezi
                    acel nivel de studii.
                  </p>

                  <div style={styles.answerRow}>
                    <button
                      type="button"
                      style={
                        requirementsAnswers.meets_degree_requirement === true
                          ? styles.answerButtonYes
                          : styles.answerButton
                      }
                      onClick={() =>
                        setRequirementAnswer("meets_degree_requirement", true)
                      }
                    >
                      Da
                    </button>

                    <button
                      type="button"
                      style={
                        requirementsAnswers.meets_degree_requirement === false
                          ? styles.answerButtonNo
                          : styles.answerButton
                      }
                      onClick={() =>
                        setRequirementAnswer("meets_degree_requirement", false)
                      }
                    >
                      Nu
                    </button>
                  </div>
                </div>
              )}

              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={confirmRequirementsPrompt}
                >
                  Confirmă
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function InfoCard({ label, value }) {
  return (
    <div style={styles.metaCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const styles = {
  page: {
    display: "grid",
    gap: 24,
    paddingBottom: 24
  },

  heroSectionSingle: {
    padding: 28,
    borderRadius: 24,
    background: "linear-gradient(135deg, #f8fafc, #eef2ff)",
    border: "1px solid #e5e7eb",
    boxShadow: "0 18px 50px rgba(15,23,42,0.08)"
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: 900,
    color: "#4f46e5",
    textTransform: "uppercase",
    letterSpacing: 1.3
  },

  heroTitle: {
    margin: "8px 0",
    fontSize: 34,
    color: "#111827",
    letterSpacing: "-0.05em"
  },

  heroText: {
    color: "#64748b",
    lineHeight: 1.7,
    maxWidth: 760
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "0.9fr 1.1fr",
    gap: 24
  },

  card: {
    background: "white",
    borderRadius: 24,
    padding: 24,
    border: "1px solid #e5e7eb",
    boxShadow: "0 10px 30px rgba(15,23,42,0.06)"
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: 900,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1.2
  },

  sectionTitle: {
    margin: "6px 0 18px",
    color: "#111827",
    fontSize: 22
  },

  form: {
    display: "grid",
    gap: 14
  },

  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12
  },

  inputGroup: {
    display: "grid",
    gap: 7
  },

  label: {
    fontSize: 12,
    fontWeight: 800,
    color: "#64748b"
  },

  input: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #d1d5db",
    fontSize: 14
  },

  textarea: {
    minHeight: 260,
    resize: "vertical",
    padding: 12,
    borderRadius: 12,
    border: "1px solid #d1d5db",
    fontSize: 14,
    fontFamily: "Inter, sans-serif"
  },

  primaryButton: {
    padding: "12px 16px",
    borderRadius: 14,
    border: "none",
    background: "#111827",
    color: "white",
    cursor: "pointer",
    fontWeight: 900
  },

  secondaryButton: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    background: "white",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 800
  },

  saveButton: {
    width: "100%",
    marginTop: 18,
    padding: 13,
    borderRadius: 14,
    border: "none",
    background: "#111827",
    color: "white",
    cursor: "pointer",
    fontWeight: 900
  },

  scoreSection: {
    display: "grid",
    gridTemplateColumns: "190px 1fr",
    gap: 18,
    alignItems: "center",
    padding: 18,
    borderRadius: 20,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    marginBottom: 16
  },

  scoreCircleWrap: {
    position: "relative",
    width: 180,
    height: 180
  },

  scoreCenter: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center"
  },

  scoreBadge: {
    display: "inline-flex",
    padding: "7px 10px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#4338ca",
    fontSize: 12,
    fontWeight: 900
  },

  scoreTitle: {
    margin: "12px 0 6px",
    color: "#111827"
  },

  scoreText: {
    color: "#64748b",
    lineHeight: 1.65
  },

  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: 12
  },

  metaCard: {
    padding: 14,
    borderRadius: 14,
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    display: "grid",
    gap: 6
  },

  metaRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8
  },

  requirementOk: {
    color: "#166534",
    fontWeight: 900
  },

  requirementMissing: {
    color: "#b91c1c",
    fontWeight: 900
  },

  mlCard: {
    marginTop: 18,
    padding: 18,
    borderRadius: 18,
    background: "#ffffff",
    border: "1px solid #c7d2fe"
  },

  mlHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12
  },

  mlLabel: {
    fontSize: 11,
    fontWeight: 900,
    color: "#4f46e5",
    textTransform: "uppercase"
  },

  mlTitle: {
    margin: "6px 0 0",
    color: "#111827"
  },

  mlBadge: {
    padding: "9px 12px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#3730a3",
    fontWeight: 900
  },

  mlText: {
    color: "#475569",
    lineHeight: 1.6
  },

  mlError: {
    marginTop: 18,
    padding: 16,
    borderRadius: 14,
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca"
  },

  xaiBox: {
    padding: 14,
    borderRadius: 14,
    background: "#eef2ff",
    color: "#3730a3"
  },

  xaiLabel: {
    fontSize: 11,
    fontWeight: 900,
    textTransform: "uppercase"
  },

  mlMetaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    marginTop: 12
  },

  mlMetaCard: {
    padding: 12,
    borderRadius: 12,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    display: "grid",
    gap: 5
  },

  probabilityList: {
    display: "grid",
    gap: 10,
    marginTop: 14
  },

  probabilityRow: {
    display: "grid",
    gridTemplateColumns: "90px 1fr 45px",
    gap: 10,
    alignItems: "center",
    fontSize: 13
  },

  probabilityBar: {
    height: 9,
    borderRadius: 999,
    background: "#e5e7eb",
    overflow: "hidden"
  },

  probabilityFill: {
    height: "100%",
    background: "linear-gradient(90deg, #378ADD, #1D9E75)"
  },

  mlNote: {
    fontSize: 12,
    color: "#64748b"
  },

  columns: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    marginTop: 18
  },

  skillCard: {
    padding: 16,
    borderRadius: 16,
    background: "#f8fafc",
    border: "1px solid #e5e7eb"
  },

  skillHeaderDanger: {
    color: "#991b1b",
    fontWeight: 900,
    marginBottom: 10
  },

  skillHeaderSuccess: {
    color: "#166534",
    fontWeight: 900,
    marginBottom: 10
  },

  tags: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8
  },

  gapTag: {
    padding: "7px 10px",
    borderRadius: 999,
    background: "#fee2e2",
    color: "#991b1b",
    fontWeight: 700,
    fontSize: 13
  },

  matchTag: {
    padding: "7px 10px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    fontWeight: 700,
    fontSize: 13
  },

  emptyText: {
    color: "#64748b",
    fontSize: 13
  },

  nextSection: {
    marginTop: 18,
    padding: 18,
    borderRadius: 16,
    background: "#f9fafb",
    border: "1px solid #e5e7eb"
  },

  nextTitle: {
    marginTop: 0
  },

  nextGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.55)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 20
  },

  modalCard: {
    width: "100%",
    maxWidth: 560,
    background: "#ffffff",
    borderRadius: 24,
    padding: 24,
    boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
    border: "1px solid #e5e7eb"
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12
  },

  modalEyebrow: {
    fontSize: 11,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#4f46e5",
    marginBottom: 6
  },

  modalTitle: {
    margin: 0,
    fontSize: 24,
    color: "#111827"
  },

  modalText: {
    color: "#64748b",
    lineHeight: 1.65,
    marginBottom: 18
  },

  closeButton: {
    border: "none",
    background: "#f3f4f6",
    width: 34,
    height: 34,
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 16
  },

  requirementBox: {
    padding: 16,
    borderRadius: 16,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    marginBottom: 14
  },

  requirementHint: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.55
  },

  answerRow: {
    display: "flex",
    gap: 10,
    marginTop: 14
  },

  answerButton: {
    flex: 1,
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    cursor: "pointer",
    fontWeight: 700
  },

  answerButtonYes: {
    flex: 1,
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    background: "#16a34a",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 800
  },

  answerButtonNo: {
    flex: 1,
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    background: "#dc2626",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 800
  },

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: 18
  }
};