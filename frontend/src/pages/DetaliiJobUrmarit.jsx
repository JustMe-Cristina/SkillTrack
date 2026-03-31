import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import AppLayout from "../components/AppLayout";

export default function DetaliiJobUrmarit() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  async function fetchJobDetails() {
    try {
      setLoading(true);
      setMessage("");

      const data = await apiFetch(`/api/jobs/${jobId}`);
      const rawJob = data.job;

      setJob({
        ...rawJob,
        matches: Array.isArray(rawJob.matches) ? rawJob.matches : [],
        gaps: Array.isArray(rawJob.gaps) ? rawJob.gaps : []
      });
    } catch (err) {
      console.error("GET JOB DETAILS ERROR:", err);
      setMessage(err.message || "Nu s-au putut încărca detaliile jobului.");
    } finally {
      setLoading(false);
    }
  }

  async function generateRoadmap() {
    try {
      const data = await apiFetch(`/api/roadmaps/generate/${jobId}`, {
        method: "POST"
      });

      setMessage(data.message || "Roadmap generat cu succes.");
    } catch (err) {
      console.error("GENERATE ROADMAP ERROR:", err);
      setMessage(err.message || "Nu s-a putut genera roadmap-ul.");
    }
  }

  function renderRequirementStatus(value) {
    if (value === true || value === 1) {
      return <span style={styles.requirementOk}>✓</span>;
    }

    if (value === false || value === 0) {
      return <span style={styles.requirementMissing}>!</span>;
    }

    return null;
  }

  return (
    <AppLayout
      title={job?.title || "Detalii job"}
      subtitle={
        job
          ? `${job.company || "Companie nespecificată"} · scor ${job.match_score || 0}%`
          : "Analiza completă a jobului salvat"
      }
    >
      {message && <div style={styles.message}>{message}</div>}

      {loading ? (
        <div style={styles.card}>Se încarcă detaliile jobului...</div>
      ) : !job ? (
        <div style={styles.card}>Jobul nu a fost găsit.</div>
      ) : (
        <div style={styles.card}>
          <div style={styles.topGrid}>
            <div style={styles.scoreBox}>
              <div style={styles.scoreLabel}>Scor de potrivire</div>
              <div style={styles.scoreValue}>{job.match_score || 0}%</div>
            </div>

            <div style={styles.metaGrid}>
              <div style={styles.metaCard}>
                <div style={styles.metaTitle}>Locație</div>
                <div style={styles.metaValue}>{job.location || "-"}</div>
              </div>

              <div style={styles.metaCard}>
                <div style={styles.metaTitle}>Mod de lucru</div>
                <div style={styles.metaValue}>{job.work_mode || "-"}</div>
              </div>

              <div style={styles.metaCard}>
                <div style={styles.metaTitle}>Tip angajare</div>
                <div style={styles.metaValue}>{job.employment_type || "-"}</div>
              </div>

              <div style={styles.metaCard}>
                <div style={styles.metaTitle}>Experiență</div>
                <div style={styles.metaValueRow}>
                  <span>{job.experience_label || "-"}</span>
                  {job.experience_label &&
                    renderRequirementStatus(job.meets_experience_requirement)}
                </div>
              </div>

              <div style={styles.metaCard}>
                <div style={styles.metaTitle}>Studii</div>
                <div style={styles.metaValueRow}>
                  <span>{job.degree_label || "-"}</span>
                  {job.degree_label &&
                    renderRequirementStatus(job.meets_degree_requirement)}
                </div>
              </div>
            </div>
          </div>

          <div style={styles.separator} />

          <h3 style={styles.subTitle}>Descriere job</h3>
          <p style={styles.description}>
            {job.description || "Fără descriere disponibilă."}
          </p>

          <div style={styles.separator} />

          <div style={styles.columns}>
            <div>
              <h3 style={styles.subTitle}>Competențe acoperite</h3>

              {job.matches.length > 0 ? (
                <div style={styles.tags}>
                  {job.matches.map((item, index) => (
                    <span key={index} style={styles.matchTag}>
                      {typeof item === "string" ? item : item.skill}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={styles.emptyText}>
                  Nu există competențe acoperite salvate pentru acest job.
                </div>
              )}
            </div>

            <div>
              <h3 style={styles.subTitle}>Competențe de dezvoltat</h3>

              {job.gaps.length > 0 ? (
                <div style={styles.tags}>
                  {job.gaps.map((item, index) => (
                    <span key={index} style={styles.gapTag}>
                      {typeof item === "string" ? item : item.skill}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={styles.emptyText}>
                  Nu există competențe lipsă salvate pentru acest job.
                </div>
              )}
            </div>
          </div>

          <div style={styles.separator} />

          <div style={styles.actions}>
            <button
              type="button"
              style={styles.primaryButton}
              onClick={generateRoadmap}
            >
              Generează roadmap
            </button>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => navigate("/joburi-urmarite")}
            >
              Înapoi la joburi urmărite
            </button>
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
  card: {
    background: "white",
    padding: 24,
    borderRadius: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)"
  },
  topGrid: {
    display: "grid",
    gridTemplateColumns: "220px 1fr",
    gap: 20,
    alignItems: "start"
  },
  scoreBox: {
    padding: 18,
    borderRadius: 14,
    background: "#f9fafb",
    border: "1px solid #e5e7eb"
  },
  scoreLabel: {
    fontSize: 12,
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
  subTitle: {
    marginTop: 0,
    marginBottom: 12,
    color: "#111827"
  },
  description: {
    color: "#374151",
    lineHeight: 1.8
  },
  columns: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20
  },
  tags: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8
  },
  matchTag: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    fontWeight: 600,
    fontSize: 14
  },
  gapTag: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "#fee2e2",
    color: "#991b1b",
    fontWeight: 600,
    fontSize: 14
  },
  emptyText: {
    color: "#6b7280",
    lineHeight: 1.7
  },
  actions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap"
  },
  primaryButton: {
    padding: "12px 14px",
    borderRadius: 8,
    border: "none",
    background: "#111827",
    color: "white",
    cursor: "pointer",
    fontWeight: 600
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