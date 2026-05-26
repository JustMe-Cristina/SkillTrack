import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { apiFetch } from "../services/api";
import MesajFeedback from "../components/MesajFeedback";

const STATUS_LABELS = {
  SALVAT: "Salvat",
  APLICAT: "Aplicat",
  INTERVIU: "Interviu",
  OFERTA: "Ofertă",
  RESPINS: "Respins",
  FARA_RASPUNS: "Fără răspuns",
};

const STATUS_OPTIONS = [
  { value: "SALVAT", label: "Salvat" },
  { value: "APLICAT", label: "Aplicat" },
  { value: "INTERVIU", label: "Interviu" },
  { value: "OFERTA", label: "Ofertă" },
  { value: "RESPINS", label: "Respins" },
  { value: "FARA_RASPUNS", label: "Fără răspuns" },
];

const WORK_MODE_LABELS = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "On-site",
};

const EMPLOYMENT_LABELS = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  INTERNSHIP: "Internship",
};

const ML_CATEGORY_LABELS = {
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

const DEGREE_LABELS = {
  NONE: "Nespecificat",
  BACHELOR: "Licență",
  MASTER: "Master",
  PHD: "Doctorat",
};

function formatDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatConfidence(value) {
  if (value === null || value === undefined || value === "") return null;

  const number = Number(value);

  if (!Number.isFinite(number)) return null;

  return `${Math.round(number * 100)}%`;
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || "Salvat";
}

function getDegreeLabel(job) {
  if (job?.degree_level && DEGREE_LABELS[job.degree_level]) {
    return DEGREE_LABELS[job.degree_level];
  }

  return job?.degree_label || "Nespecificat";
}

function getScoreTone(score) {
  const value = Number(score || 0);

  if (value >= 75) return "high";
  if (value >= 45) return "medium";

  return "low";
}

export default function JoburiUrmarite() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [mlFilter, setMlFilter] = useState("ALL");
  const [updatingJobId, setUpdatingJobId] = useState(null);
  const [deletingJobId, setDeletingJobId] = useState(null);
  const [offerPopupJob, setOfferPopupJob] = useState(null);

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    setLoading(true);
    setMessage("");

    try {
      const data = await apiFetch("/api/jobs");

      const normalizedJobs = Array.isArray(data.jobs)
        ? data.jobs
        : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];

      setJobs(normalizedJobs);
    } catch (err) {
      console.error("LOAD JOBS ERROR:", err);
      setMessage(err.message || "Nu s-au putut încărca joburile urmărite.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(jobId, status) {
    setUpdatingJobId(jobId);
    setMessage("");

    const currentJob = jobs.find((job) => Number(job.id) === Number(jobId));

    try {
      await apiFetch(`/api/jobs/${jobId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      const updatedJob = currentJob
        ? {
            ...currentJob,
            status,
          }
        : {
            id: jobId,
            status,
            title: "jobul selectat",
          };

      setJobs((prev) =>
        prev.map((job) =>
          Number(job.id) === Number(jobId)
            ? {
                ...job,
                status,
              }
            : job,
        ),
      );

      if (status === "OFERTA") {
        setOfferPopupJob(updatedJob);
      }
    } catch (err) {
      console.error("UPDATE JOB STATUS ERROR:", err);
      setMessage(err.message || "Nu s-a putut actualiza statusul jobului.");
    } finally {
      setUpdatingJobId(null);
    }
  }

  async function handleDeleteJob(jobId, jobTitle) {
    const confirmed = window.confirm(
      `Sigur vrei să ștergi jobul „${
        jobTitle || "selectat"
      }” din lista de joburi urmărite?`,
    );

    if (!confirmed) return;

    setDeletingJobId(jobId);
    setMessage("");

    try {
      await apiFetch(`/api/jobs/${jobId}`, {
        method: "DELETE",
      });

      setJobs((prev) => prev.filter((job) => Number(job.id) !== Number(jobId)));

      setMessage("Jobul a fost șters cu succes.");
    } catch (err) {
      console.error("DELETE JOB ERROR:", err);
      setMessage(err.message || "Nu s-a putut șterge jobul.");
    } finally {
      setDeletingJobId(null);
    }
  }

  const mlCategories = useMemo(() => {
    const categories = new Set();

    jobs.forEach((job) => {
      if (job.ml_predicted_category) {
        categories.add(job.ml_predicted_category);
      }
    });

    return Array.from(categories).sort();
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesSearch =
        !query ||
        String(job.title || "")
          .toLowerCase()
          .includes(query) ||
        String(job.company || "")
          .toLowerCase()
          .includes(query) ||
        String(job.location || "")
          .toLowerCase()
          .includes(query) ||
        String(job.ml_predicted_category || "")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "ALL" || job.status === statusFilter;

      const matchesMl =
        mlFilter === "ALL" || job.ml_predicted_category === mlFilter;

      return matchesSearch && matchesStatus && matchesMl;
    });
  }, [jobs, search, statusFilter, mlFilter]);

  const stats = useMemo(() => {
    const total = jobs.length;

    const applied = jobs.filter((job) =>
      ["APLICAT", "INTERVIU", "OFERTA"].includes(job.status),
    ).length;

    const avgScore =
      total === 0
        ? 0
        : Math.round(
            jobs.reduce((sum, job) => sum + Number(job.match_score || 0), 0) /
              total,
          );

    return {
      total,
      applied,
      avgScore,
    };
  }, [jobs]);

  return (
    <AppLayout
      title="Joburi urmărite"
      subtitle="Urmărește joburile salvate, scorul de potrivire și statusul aplicării."
    >
      {message && <MesajFeedback message={message} type="info" />}

      {loading ? (
        <div style={styles.card}>
          <div style={styles.muted}>Se încarcă joburile urmărite...</div>
        </div>
      ) : (
        <>
          <div style={styles.heroCard}>
            <div>
              <div style={styles.eyebrow}>SkillTrack Jobs</div>
              <h1 style={styles.heroTitle}>Joburi urmărite</h1>
              <p style={styles.heroText}>
                Aici vezi joburile salvate după analiză, scorul de potrivire și
                progresul tău în procesul de aplicare.
              </p>
            </div>

            <div style={styles.heroRight}>
              <div style={styles.heroStats}>
                <span>Scor mediu</span>
                <strong>{stats.avgScore}%</strong>
                <p>compatibilitate medie</p>
              </div>

              <div style={styles.heroMiniStats}>
                <div style={styles.heroMiniCard}>
                  <strong>{stats.total}</strong>
                  <span>joburi salvate</span>
                </div>

                <div style={styles.heroMiniCard}>
                  <strong>{stats.applied}</strong>
                  <span>în aplicare</span>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.filtersCard}>
            <div style={styles.filterSearchGroup}>
              <label style={styles.filterLabel}>Căutare</label>
              <input
                style={styles.searchInput}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Caută job, companie, locație..."
              />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Status</label>
              <select
                style={styles.select}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="ALL">Toate</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Categorie ML</label>
              <select
                style={styles.select}
                value={mlFilter}
                onChange={(event) => setMlFilter(event.target.value)}
              >
                <option value="ALL">Toate</option>
                {mlCategories.map((category) => (
                  <option key={category} value={category}>
                    {ML_CATEGORY_LABELS[category] || category}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              style={styles.resetButton}
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
                setMlFilter("ALL");
              }}
            >
              Resetează filtre
            </button>
          </div>

          {filteredJobs.length === 0 ? (
            <div style={styles.card}>
              <EmptyState message="Nu există joburi pentru filtrele curente." />

              <button
                type="button"
                style={styles.primaryButton}
                onClick={() => navigate("/analiza")}
              >
                Analizează un job nou
              </button>
            </div>
          ) : (
            <div style={styles.jobsGrid}>
              {filteredJobs.map((job) => {
                const scoreTone = getScoreTone(job.match_score);
                const confidence = formatConfidence(job.ml_confidence);

                return (
                  <article key={job.id} style={styles.jobCard}>
                    <div style={styles.jobHeader}>
                      <div>
                        <div style={styles.jobEyebrow}>
                          {job.company || "Companie necunoscută"}
                        </div>

                        <h2 style={styles.jobTitle}>{job.title}</h2>

                        <div style={styles.jobMeta}>
                          <span>{job.location || "Locație nespecificată"}</span>
                          <span>•</span>
                          <span>
                            {WORK_MODE_LABELS[job.work_mode] ||
                              job.work_mode ||
                              "Mod nespecificat"}
                          </span>
                          <span>•</span>
                          <span>
                            {EMPLOYMENT_LABELS[job.employment_type] ||
                              job.employment_type ||
                              "Tip nespecificat"}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          ...styles.scoreBadge,
                          ...(scoreTone === "high"
                            ? styles.scoreHigh
                            : scoreTone === "medium"
                              ? styles.scoreMedium
                              : styles.scoreLow),
                        }}
                      >
                        {job.match_score ?? 0}%
                      </div>
                    </div>

                    <div style={styles.jobInfoGrid}>
                      <div style={styles.miniInfo}>
                        <span>Status</span>
                        <strong>{getStatusLabel(job.status)}</strong>
                      </div>

                      <div style={styles.miniInfo}>
                        <span>Categorie ML</span>
                        <strong>
                          {ML_CATEGORY_LABELS[job.ml_predicted_category] ||
                            job.ml_predicted_category ||
                            "N/A"}
                        </strong>
                      </div>

                      <div style={styles.miniInfo}>
                        <span>Confidence</span>
                        <strong>{confidence || "N/A"}</strong>
                      </div>

                      <div style={styles.miniInfo}>
                        <span>Salvat</span>
                        <strong>{formatDate(job.created_at)}</strong>
                      </div>
                    </div>

                    <div style={styles.badgeRow}>
                      {job.experience_label && (
                        <span style={styles.softBadge}>
                          Experiență: {job.experience_label}
                        </span>
                      )}

                      <span style={styles.softBadge}>
                        Studii: {getDegreeLabel(job)}
                      </span>

                      {job.ml_model && (
                        <span style={styles.mlBadge}>
                          Model: {job.ml_model}
                        </span>
                      )}
                    </div>

                    <div style={styles.statusBlock}>
                      <label style={styles.statusLabel}>
                        Actualizează statusul:
                        <select
                          style={styles.statusSelect}
                          value={job.status || "SALVAT"}
                          disabled={updatingJobId === job.id}
                          onChange={(event) =>
                            handleStatusChange(job.id, event.target.value)
                          }
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div style={styles.actions}>
                      <button
                        type="button"
                        style={styles.primaryButton}
                        onClick={() => navigate(`/joburi-urmarite/${job.id}`)}
                      >
                        Vezi detalii
                      </button>

                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={() =>
                          navigate(`/joburi-urmarite/${job.id}?edit=1`)
                        }
                      >
                        Editează
                      </button>

                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={() => navigate("/roadmaps")}
                      >
                        Roadmap
                      </button>

                      <button
                        type="button"
                        style={styles.deleteButton}
                        onClick={() => handleDeleteJob(job.id, job.title)}
                        disabled={deletingJobId === job.id}
                      >
                        {deletingJobId === job.id ? "Se șterge..." : "Șterge"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {offerPopupJob && (
        <div style={styles.overlay}>
          <div style={styles.offerModal}>
            <div style={styles.offerModalIcon}>🏆</div>

            <h2 style={styles.offerModalTitle}>Felicitări!</h2>

            <p style={styles.offerModalText}>
              Ai primit o ofertă pentru jobul{" "}
              <strong>{offerPopupJob.title || "selectat"}</strong>
              {offerPopupJob.company ? (
                <>
                  {" "}
                  de la <strong>{offerPopupJob.company}</strong>
                </>
              ) : null}
              . Acest rezultat va apărea și în profilul tău ca achievement.
            </p>

            <div style={styles.offerModalActions}>
              <button
                type="button"
                style={styles.offerModalSecondaryButton}
                onClick={() => setOfferPopupJob(null)}
              >
                Închide
              </button>

              <button
                type="button"
                style={styles.offerModalPrimaryButton}
                onClick={() => {
                  setOfferPopupJob(null);
                  navigate("/profilul-meu");
                }}
              >
                Mergi la Profilul meu
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
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
  message: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    background: "#ffffff",
    color: "#374151",
    boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
  },

  muted: {
    color: "#9ca3af",
    fontSize: 14,
  },

  card: {
    background: "white",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
    border: "1px solid #f1f5f9",
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
    boxShadow: "0 16px 45px rgba(15,23,42,0.08)",
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: 800,
    color: "#4f46e5",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 8,
  },

  heroTitle: {
    margin: 0,
    fontSize: 34,
    color: "#111827",
    letterSpacing: "-0.04em",
  },

  heroText: {
    margin: "10px 0 0",
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.7,
    maxWidth: 760,
  },

  heroRight: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minWidth: 250,
  },

  heroStats: {
    borderRadius: 18,
    background: "#111827",
    color: "white",
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  heroMiniStats: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },

  heroMiniCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
  },

  filtersCard: {
    display: "grid",
    gridTemplateColumns: "1.4fr 180px 180px auto",
    gap: 12,
    alignItems: "end",
    marginBottom: 16,
    padding: 16,
    borderRadius: 18,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
  },

  filterSearchGroup: {
    display: "grid",
    gap: 6,
    minWidth: 0,
  },

  filterGroup: {
    display: "grid",
    gap: 6,
  },

  filterLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  searchInput: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d1d5db",
    borderRadius: 12,
    padding: "11px 12px",
    background: "#ffffff",
    color: "#111827",
    outline: "none",
    fontSize: 14,
  },

  select: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d1d5db",
    borderRadius: 12,
    padding: "11px 12px",
    background: "#ffffff",
    color: "#111827",
    fontWeight: 700,
    outline: "none",
    fontSize: 14,
  },

  resetButton: {
    padding: "11px 14px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    background: "#f8fafc",
    color: "#374151",
    cursor: "pointer",
    fontWeight: 800,
    whiteSpace: "nowrap",
    height: 42,
  },

  jobsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 16,
  },

  jobCard: {
    background: "#ffffff",
    borderRadius: 18,
    padding: 20,
    border: "1px solid #f1f5f9",
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
  },

  jobHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    marginBottom: 16,
  },

  jobEyebrow: {
    fontSize: 11,
    fontWeight: 800,
    color: "#6366f1",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },

  jobTitle: {
    margin: 0,
    color: "#111827",
    fontSize: 20,
    letterSpacing: "-0.02em",
  },

  jobMeta: {
    marginTop: 8,
    display: "flex",
    flexWrap: "wrap",
    gap: 7,
    color: "#64748b",
    fontSize: 13,
  },

  scoreBadge: {
    minWidth: 64,
    height: 64,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 18,
    flexShrink: 0,
  },

  scoreHigh: {
    background: "#dcfce7",
    color: "#166534",
  },

  scoreMedium: {
    background: "#fef3c7",
    color: "#92400e",
  },

  scoreLow: {
    background: "#fee2e2",
    color: "#991b1b",
  },

  jobInfoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 10,
    marginBottom: 14,
  },

  miniInfo: {
    padding: 10,
    borderRadius: 12,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    gap: 5,
    minWidth: 0,
  },

  badgeRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 14,
  },

  softBadge: {
    padding: "7px 10px",
    borderRadius: 999,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    color: "#475569",
    fontWeight: 700,
    fontSize: 12,
  },

  mlBadge: {
    padding: "7px 10px",
    borderRadius: 999,
    background: "#eef2ff",
    border: "1px solid #c7d2fe",
    color: "#3730a3",
    fontWeight: 800,
    fontSize: 12,
  },

  statusBlock: {
    padding: 12,
    borderRadius: 14,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    marginBottom: 14,
  },

  statusLabel: {
    display: "grid",
    gap: 8,
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
  },

  statusSelect: {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    padding: "9px 10px",
    background: "#ffffff",
    color: "#111827",
    fontWeight: 700,
    outline: "none",
  },

  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  primaryButton: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  secondaryButton: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  deleteButton: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #fecaca",
    background: "#fff1f2",
    color: "#b91c1c",
    cursor: "pointer",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 20,
  },

  offerModal: {
    width: "100%",
    maxWidth: 480,
    background: "#ffffff",
    borderRadius: 24,
    padding: 28,
    boxShadow: "0 24px 70px rgba(15, 23, 42, 0.25)",
    textAlign: "center",
    border: "1px solid #fde68a",
  },

  offerModalIcon: {
    width: 72,
    height: 72,
    margin: "0 auto 14px",
    borderRadius: "50%",
    background: "#fef3c7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 38,
  },

  offerModalTitle: {
    margin: "0 0 10px",
    color: "#111827",
    fontSize: 28,
    letterSpacing: "-0.03em",
  },

  offerModalText: {
    margin: "0 0 22px",
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.7,
  },

  offerModalActions: {
    display: "flex",
    justifyContent: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  offerModalPrimaryButton: {
    padding: "11px 15px",
    borderRadius: 12,
    border: "none",
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 900,
  },

  offerModalSecondaryButton: {
    padding: "11px 15px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 900,
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
    fontSize: 13,
    marginBottom: 16,
  },
};
