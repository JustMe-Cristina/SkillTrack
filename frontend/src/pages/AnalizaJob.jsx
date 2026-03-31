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

  async function handleAnalyze(e) {
    e.preventDefault();
    setMessage("");
    setAnalysis(null);
    setShowNextActions(false);
    setSavedJobId(null);

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
    } catch (err) {
      console.error("JOB ANALYZE ERROR:", err);
      setMessage(err.message || "Nu s-a putut analiza jobul.");
    } finally {
      setLoadingAnalyze(false);
    }
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
          status: "SALVAT"
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
    gridTemplateColumns: "repeat(3, 1fr)",
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
  }
};