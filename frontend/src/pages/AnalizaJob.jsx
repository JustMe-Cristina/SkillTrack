import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import AppLayout from "../components/AppLayout";

export default function AnalizaJob() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const [analysis, setAnalysis] = useState(null);
  const [message, setMessage] = useState("");
  const [loadingAnalyze, setLoadingAnalyze] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);

  const [savedJobId, setSavedJobId] = useState(null);
  const [showNextActions, setShowNextActions] = useState(false);

  const [showRequirementsPrompt, setShowRequirementsPrompt] = useState(false);
  const [requirementsAnswers, setRequirementsAnswers] = useState({
    meets_experience_requirement: null,
    meets_degree_requirement: null
  });

  async function handleAnalyze(e) {
    e.preventDefault();
    setMessage("");
    setAnalysis(null);
    setShowNextActions(false);
    setSavedJobId(null);
    setShowRequirementsPrompt(false);
    setRequirementsAnswers({
      meets_experience_requirement: null,
      meets_degree_requirement: null
    });

    if (!title.trim() || !description.trim()) {
      setMessage("Completează titlul și descrierea jobului.");
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

      const hasExperienceRequirement = !!data.experience_label;
      const hasDegreeRequirement = !!data.degree_label;

      if (hasExperienceRequirement || hasDegreeRequirement) {
        setRequirementsAnswers({
          meets_experience_requirement: hasExperienceRequirement ? null : null,
          meets_degree_requirement: hasDegreeRequirement ? null : null
        });
        setShowRequirementsPrompt(true);
      }
    } catch (err) {
      console.error("JOB ANALYZE ERROR:", err);
      setMessage(err.message || "Nu s-a putut analiza jobul.");
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
    const needsExperienceAnswer = !!analysis?.experience_label;
    const needsDegreeAnswer = !!analysis?.degree_label;

    if (
      needsExperienceAnswer &&
      requirementsAnswers.meets_experience_requirement === null
    ) {
      setMessage("Confirmă dacă îndeplinești cerința de experiență.");
      return;
    }

    if (
      needsDegreeAnswer &&
      requirementsAnswers.meets_degree_requirement === null
    ) {
      setMessage("Confirmă dacă îndeplinești cerința de studii.");
      return;
    }

    setMessage("");
    setShowRequirementsPrompt(false);
  }

  async function handleSaveJob() {
    if (!analysis) return;

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
            : null
        })
      });

      setMessage("Jobul a fost salvat cu succes.");
      setSavedJobId(data.jobId || data.id || null);
      setShowNextActions(true);
    } catch (err) {
      console.error("JOB SAVE ERROR:", err);
      setMessage(err.message || "Nu s-a putut salva jobul.");
    } finally {
      setLoadingSave(false);
    }
  }

  function renderRequirementStatus(value) {
    if (value === true) {
      return <span style={styles.requirementOk}>✓</span>;
    }

    if (value === false) {
      return <span style={styles.requirementMissing}>!</span>;
    }

    return null;
  }

  return (
    <AppLayout
      title="Analiză job"
      subtitle="Analizează un job și vezi rapid gradul de potrivire cu profilul tău"
    >
      {message && <div style={styles.message}>{message}</div>}

      <div style={styles.grid}>
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Date job</h2>

          <form onSubmit={handleAnalyze} style={styles.form}>
            <input
              style={styles.input}
              placeholder="Titlul jobului"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <input
              style={styles.input}
              placeholder="Companie"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />

            <input
              style={styles.input}
              placeholder="Locație (opțional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />

            <textarea
              style={styles.textarea}
              placeholder="Descrierea jobului"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <button
              type="submit"
              style={styles.button}
              disabled={loadingAnalyze}
            >
              {loadingAnalyze ? "Se analizează..." : "Analizează jobul"}
            </button>
          </form>
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Rezultat analiză</h2>

          {!analysis ? (
            <div style={styles.placeholder}>
              Completează formularul și apasă pe „Analizează jobul”.
            </div>
          ) : (
            <>
              <div style={styles.scoreBox}>
                <div style={styles.scoreLabel}>Scor de potrivire</div>
                <div style={styles.scoreValue}>{analysis.score}%</div>
              </div>

              <div style={styles.metaGrid}>
                <div style={styles.metaCard}>
                  <div style={styles.metaTitle}>Locație</div>
                  <div style={styles.metaValue}>{analysis.location || "-"}</div>
                </div>

                <div style={styles.metaCard}>
                  <div style={styles.metaTitle}>Mod de lucru</div>
                  <div style={styles.metaValue}>
                    {analysis.work_mode || "-"}
                  </div>
                </div>

                <div style={styles.metaCard}>
                  <div style={styles.metaTitle}>Tip angajare</div>
                  <div style={styles.metaValue}>
                    {analysis.employment_type || "-"}
                  </div>
                </div>

                {analysis.experience_label && (
                  <div style={styles.metaCard}>
                    <div style={styles.metaTitle}>Experiență</div>
                    <div style={styles.metaValueRow}>
                      <span>{analysis.experience_label}</span>
                      {renderRequirementStatus(
                        requirementsAnswers.meets_experience_requirement
                      )}
                    </div>
                  </div>
                )}

                {analysis.degree_label && (
                  <div style={styles.metaCard}>
                    <div style={styles.metaTitle}>Studii</div>
                    <div style={styles.metaValueRow}>
                      <span>{analysis.degree_label}</span>
                      {renderRequirementStatus(
                        requirementsAnswers.meets_degree_requirement
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div style={styles.separator} />

              <div style={styles.columns}>
                <div>
                  <h3 style={styles.subTitle}>Competențe de dezvoltat</h3>

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
                      Nu există competențe de dezvoltat.
                    </div>
                  )}
                </div>

                <div>
                  <h3 style={styles.subTitle}>Competențe acoperite</h3>

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
                      Nu există competențe acoperite.
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.separator} />

              <button
                type="button"
                style={styles.button}
                onClick={handleSaveJob}
                disabled={loadingSave}
              >
                {loadingSave ? "Se salvează..." : "Salvează jobul"}
              </button>

              {showNextActions && (
                <div style={styles.nextActionsCard}>
                  <h3 style={styles.subTitle}>Ce vrei să faci mai departe?</h3>
                  <p style={styles.nextActionsText}>
                    Analiza a fost salvată cu succes. Poți continua cu unul
                    dintre pașii de mai jos.
                  </p>

                  <div style={styles.nextActionsGrid}>
                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={() =>
                        savedJobId
                          ? navigate(`/joburi-urmarite/${savedJobId}`)
                          : navigate("/joburi-urmarite")
                      }
                    >
                      Vezi în Joburi urmărite
                    </button>

                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={() => navigate("/competentele-mele")}
                    >
                      Vezi competențele mele
                    </button>

                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={() => navigate("/roadmaps")}
                    >
                      Mergi la roadmap-uri
                    </button>

                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={() => navigate("/analytics")}
                    >
                      Vezi analytics
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showRequirementsPrompt && analysis && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Confirmare criterii job</h3>

            <p style={styles.modalText}>
              Am detectat cerințe suplimentare din descrierea jobului. Confirmă
              dacă le îndeplinești.
            </p>

            {analysis.experience_label && (
              <div style={styles.requirementQuestion}>
                <div style={styles.requirementQuestionTitle}>
                  Experiență cerută: {analysis.experience_label}
                </div>

                <div style={styles.answerRow}>
                  <button
                    type="button"
                    style={
                      requirementsAnswers.meets_experience_requirement === true
                        ? styles.answerButtonActiveYes
                        : styles.answerButton
                    }
                    onClick={() =>
                      setRequirementAnswer("meets_experience_requirement", true)
                    }
                  >
                    Da
                  </button>

                  <button
                    type="button"
                    style={
                      requirementsAnswers.meets_experience_requirement === false
                        ? styles.answerButtonActiveNo
                        : styles.answerButton
                    }
                    onClick={() =>
                      setRequirementAnswer("meets_experience_requirement", false)
                    }
                  >
                    Nu
                  </button>
                </div>
              </div>
            )}

            {analysis.degree_label && (
              <div style={styles.requirementQuestion}>
                <div style={styles.requirementQuestionTitle}>
                  Studii cerute: {analysis.degree_label}
                </div>

                <div style={styles.answerRow}>
                  <button
                    type="button"
                    style={
                      requirementsAnswers.meets_degree_requirement === true
                        ? styles.answerButtonActiveYes
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
                        ? styles.answerButtonActiveNo
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
    </AppLayout>
  );
}

const styles = {
  message: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    background: "#ffffff",
    color: "#374151",
    boxShadow: "0 10px 30px rgba(0,0,0,0.04)"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20
  },
  card: {
    background: "white",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)"
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: 16,
    color: "#111827"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12
  },
  input: {
    padding: 12,
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 14
  },
  textarea: {
    minHeight: 220,
    resize: "vertical",
    padding: 12,
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 14,
    fontFamily: "Inter, sans-serif"
  },
  button: {
    padding: 12,
    borderRadius: 8,
    border: "none",
    background: "#111827",
    color: "white",
    cursor: "pointer",
    fontWeight: 600
  },
  placeholder: {
    color: "#6b7280",
    lineHeight: 1.7
  },
  scoreBox: {
    padding: 16,
    borderRadius: 14,
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    marginBottom: 18
  },
  scoreLabel: {
    fontSize: 13,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 1
  },
  scoreValue: {
    marginTop: 8,
    fontSize: 36,
    fontWeight: 800,
    color: "#111827"
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 12
  },
  metaCard: {
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 14
  },
  metaTitle: {
    fontSize: 12,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 1
  },
  metaValue: {
    marginTop: 6,
    color: "#111827",
    fontWeight: 600
  },
  metaValueRow: {
    marginTop: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    color: "#111827",
    fontWeight: 600
  },
  requirementOk: {
    width: 22,
    height: 22,
    borderRadius: "999px",
    background: "#dcfce7",
    color: "#166534",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    flexShrink: 0
  },
  requirementMissing: {
    width: 22,
    height: 22,
    borderRadius: "999px",
    background: "#fee2e2",
    color: "#991b1b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    flexShrink: 0
  },
  separator: {
    height: 1,
    background: "#e5e7eb",
    margin: "20px 0"
  },
  columns: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20
  },
  subTitle: {
    marginTop: 0,
    marginBottom: 12,
    color: "#111827"
  },
  tags: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8
  },
  gapTag: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "#fee2e2",
    color: "#991b1b",
    fontWeight: 600,
    fontSize: 14
  },
  matchTag: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    fontWeight: 600,
    fontSize: 14
  },
  emptyText: {
    color: "#6b7280"
  },
  nextActionsCard: {
    marginTop: 20,
    padding: 20,
    borderRadius: 14,
    background: "#f9fafb",
    border: "1px solid #e5e7eb"
  },
  nextActionsText: {
    color: "#4b5563",
    lineHeight: 1.6,
    marginBottom: 14
  },
  nextActionsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12
  },
  secondaryButton: {
    padding: "12px 14px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "white",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 600
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(17, 24, 39, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999
  },
  modal: {
    width: "100%",
    maxWidth: 560,
    background: "white",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 20px 40px rgba(0,0,0,0.18)"
  },
  modalTitle: {
    marginTop: 0,
    marginBottom: 12,
    color: "#111827"
  },
  modalText: {
    color: "#4b5563",
    lineHeight: 1.7,
    marginBottom: 16
  },
  requirementQuestion: {
    padding: 14,
    borderRadius: 12,
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    marginBottom: 14
  },
  requirementQuestionTitle: {
    fontWeight: 700,
    color: "#111827",
    marginBottom: 12
  },
  answerRow: {
    display: "flex",
    gap: 10
  },
  answerButton: {
    padding: "10px 16px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "white",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 600
  },
  answerButtonActiveYes: {
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background: "#166534",
    color: "white",
    cursor: "pointer",
    fontWeight: 600
  },
  answerButtonActiveNo: {
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background: "#b91c1c",
    color: "white",
    cursor: "pointer",
    fontWeight: 600
  },
  modalActions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 16
  },
  primaryButton: {
    padding: "12px 14px",
    borderRadius: 8,
    border: "none",
    background: "#111827",
    color: "white",
    cursor: "pointer",
    fontWeight: 600
  }
};