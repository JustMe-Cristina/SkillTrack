import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import AppLayout from "../components/AppLayout";

const initialEditState = {
  id: null,
  company: "",
  location: "",
  work_mode: "",
  employment_type: "",
  status: "SALVAT",
  applied_at: "",
  start_period: ""
};

export default function JoburiUrmarite() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(initialEditState);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    try {
      setLoading(true);
      setMessage("");

      const data = await apiFetch("/api/jobs");
      setJobs(data.jobs || []);
    } catch (err) {
      console.error("GET JOBS ERROR:", err);
      setMessage(err.message || "Nu s-au putut încărca joburile.");
    } finally {
      setLoading(false);
    }
  }

  function goToDetails(jobId) {
    navigate(`/joburi-urmarite/${jobId}`);
  }

  function openEditModal(job) {
    setEditForm({
      id: job.id,
      company: job.company || "",
      location: job.location || "",
      work_mode: job.work_mode || "",
      employment_type: job.employment_type || "",
      status: job.status || "SALVAT",
      applied_at: toInputDate(job.applied_at),
      start_period: job.start_period || ""
    });
    setIsEditOpen(true);
    setMessage("");
  }

  function closeEditModal() {
    setIsEditOpen(false);
    setEditForm(initialEditState);
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  async function saveEdit() {
    if (!editForm.id) return;

    try {
      setSavingEdit(true);
      setMessage("");

      const payload = {
        company: editForm.company || null,
        location: editForm.location,
        work_mode: editForm.work_mode || null,
        employment_type: editForm.employment_type || null,
        status: editForm.status || "SALVAT",
        applied_at: editForm.applied_at || null,
        start_period: editForm.start_period || null
      };

      await apiFetch(`/api/jobs/${editForm.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });

      setMessage("Jobul a fost actualizat cu succes.");
      closeEditModal();
      await fetchJobs();
    } catch (err) {
      console.error("PATCH JOB ERROR:", err);
      setMessage(err.message || "Nu s-a putut actualiza jobul.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteJob(id) {
    const confirmDelete = window.confirm(
      "Sigur vrei să ștergi acest job urmărit?"
    );

    if (!confirmDelete) return;

    try {
      setMessage("");

      await apiFetch(`/api/jobs/${id}`, {
        method: "DELETE"
      });

      setMessage("Jobul a fost șters.");
      await fetchJobs();
    } catch (err) {
      console.error("DELETE JOB ERROR:", err);
      setMessage(err.message || "Nu s-a putut șterge jobul.");
    }
  }

  async function generateRoadmap(jobId) {
    try {
      setMessage("");

      const data = await apiFetch(`/api/roadmaps/generate/${jobId}`, {
        method: "POST"
      });

      setMessage(
        data.message || "Roadmap generat cu succes."
      );
    } catch (err) {
      console.error("GENERATE ROADMAP ERROR:", err);
      setMessage(err.message || "Nu s-a putut genera roadmap-ul.");
    }
  }

  async function quickUpdateStatus(jobId, status) {
    try {
      setMessage("");

      await apiFetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });

      setMessage("Statusul jobului a fost actualizat.");
      await fetchJobs();
    } catch (err) {
      console.error("QUICK STATUS UPDATE ERROR:", err);
      setMessage(err.message || "Nu s-a putut actualiza statusul.");
    }
  }

  return (
    <AppLayout
      title="Joburi urmărite"
      subtitle="Gestionează joburile salvate, vezi analiza completă și actualizează manual informațiile relevante"
    >
      {message && <div style={styles.message}>{message}</div>}

      {loading ? (
        <div style={styles.card}>Se încarcă joburile...</div>
      ) : jobs.length === 0 ? (
        <div style={styles.card}>
          <div style={styles.emptyTitle}>Nu ai joburi salvate.</div>
          <div style={styles.emptyText}>
            Analizează un job și salvează-l pentru a-l urmări aici.
          </div>
        </div>
      ) : (
        <div style={styles.grid}>
          {jobs.map((job) => (
            <div key={job.id} style={styles.card}>
              <div style={styles.topRow}>
                <div>
                  <h3 style={styles.title}>{job.title}</h3>
                  <p style={styles.company}>
                    {job.company || "Companie nespecificată"}
                  </p>
                </div>

                <div style={styles.scoreBox}>
                  <div style={styles.scoreLabel}>Match</div>
                  <div style={styles.scoreValue}>{job.match_score || 0}%</div>
                </div>
              </div>

              <div style={styles.metaGrid}>
                <div style={styles.metaCard}>
                  <div style={styles.metaLabel}>Locație</div>
                  <div style={styles.metaValue}>{job.location || "-"}</div>
                </div>

                <div style={styles.metaCard}>
                  <div style={styles.metaLabel}>Status</div>
                  <div style={styles.metaValue}>
                    {formatStatus(job.status)}
                  </div>
                </div>

                <div style={styles.metaCard}>
                  <div style={styles.metaLabel}>Tip job</div>
                  <div style={styles.metaValue}>
                    {formatEmploymentType(job.employment_type)}
                  </div>
                </div>
              </div>

              <p style={styles.description}>
                {job.description
                  ? truncateText(job.description, 220)
                  : "Fără descriere disponibilă."}
              </p>

              <div style={styles.statusRow}>
                <label style={styles.selectLabel}>
                  Actualizează rapid statusul:
                </label>

                <select
                  style={styles.select}
                  value={job.status || "SALVAT"}
                  onChange={(e) => quickUpdateStatus(job.id, e.target.value)}
                >
                  <option value="SALVAT">Salvat</option>
                  <option value="APLICAT">Aplicat</option>
                  <option value="IN_PROCES">În proces</option>
                  <option value="RESPINS">Respins</option>
                  <option value="ACCEPTAT">Acceptat</option>
                </select>
              </div>

              <div style={styles.actions}>
                <button
                  type="button"
                  onClick={() => goToDetails(job.id)}
                  style={styles.primaryButton}
                >
                  Detalii job
                </button>

                <button
                  type="button"
                  onClick={() => openEditModal(job)}
                  style={styles.secondaryButton}
                >
                  Editează
                </button>

                <button
                  type="button"
                  onClick={() => generateRoadmap(job.id)}
                  style={styles.secondaryButton}
                >
                  Generează roadmap
                </button>

                <button
                  type="button"
                  onClick={() => deleteJob(job.id)}
                  style={styles.deleteButton}
                >
                  Șterge
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isEditOpen && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Editează jobul urmărit</h3>
            <p style={styles.modalText}>
              Poți actualiza manual informațiile relevante pentru procesul tău de aplicare.
            </p>

            <div style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.label}>Companie</label>
                <input
                  style={styles.input}
                  name="company"
                  value={editForm.company}
                  onChange={handleEditChange}
                  placeholder="Companie"
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Locație</label>
                <input
                  style={styles.input}
                  name="location"
                  value={editForm.location}
                  onChange={handleEditChange}
                  placeholder="Locație"
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Mod de lucru</label>
                <select
                  style={styles.input}
                  name="work_mode"
                  value={editForm.work_mode}
                  onChange={handleEditChange}
                >
                  <option value="">Nespecificat</option>
                  <option value="REMOTE">Remote</option>
                  <option value="HYBRID">Hybrid</option>
                  <option value="ONSITE">Onsite</option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Tip angajare</label>
                <select
                  style={styles.input}
                  name="employment_type"
                  value={editForm.employment_type}
                  onChange={handleEditChange}
                >
                  <option value="">Nespecificat</option>
                  <option value="FULL_TIME">Full-time</option>
                  <option value="PART_TIME">Part-time</option>
                  <option value="INTERNSHIP">Internship</option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Status</label>
                <select
                  style={styles.input}
                  name="status"
                  value={editForm.status}
                  onChange={handleEditChange}
                >
                  <option value="SALVAT">Salvat</option>
                  <option value="APLICAT">Aplicat</option>
                  <option value="IN_PROCES">În proces</option>
                  <option value="RESPINS">Respins</option>
                  <option value="ACCEPTAT">Acceptat</option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Data aplicării</label>
                <input
                  style={styles.input}
                  type="date"
                  name="applied_at"
                  value={editForm.applied_at}
                  onChange={handleEditChange}
                />
              </div>

              <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                <label style={styles.label}>Perioadă de start</label>
                <input
                  style={styles.input}
                  name="start_period"
                  value={editForm.start_period}
                  onChange={handleEditChange}
                  placeholder="Ex: Iulie 2026 / ASAP / Septembrie 2026"
                />
              </div>
            </div>

            <div style={styles.modalActions}>
              <button
                type="button"
                style={styles.primaryButton}
                onClick={saveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? "Se salvează..." : "Salvează modificările"}
              </button>

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={closeEditModal}
                disabled={savingEdit}
              >
                Renunță
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function formatStatus(status) {
  if (status === "SALVAT") return "Salvat";
  if (status === "APLICAT") return "Aplicat";
  if (status === "IN_PROCES") return "În proces";
  if (status === "RESPINS") return "Respins";
  if (status === "ACCEPTAT") return "Acceptat";
  return status || "-";
}

function formatEmploymentType(type) {
  if (type === "FULL_TIME") return "Full-time";
  if (type === "PART_TIME") return "Part-time";
  if (type === "INTERNSHIP") return "Internship";
  return type || "-";
}

function truncateText(text, maxLength = 180) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function toInputDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
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
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: 20
  },
  card: {
    background: "white",
    padding: 24,
    borderRadius: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)"
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 18
  },
  title: {
    margin: 0,
    color: "#111827"
  },
  company: {
    marginTop: 8,
    marginBottom: 0,
    color: "#6b7280"
  },
  scoreBox: {
    minWidth: 92,
    padding: 12,
    borderRadius: 12,
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    textAlign: "center"
  },
  scoreLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#6b7280"
  },
  scoreValue: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: 800,
    color: "#111827"
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    marginBottom: 18
  },
  metaCard: {
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 12
  },
  metaLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#6b7280"
  },
  metaValue: {
    marginTop: 6,
    color: "#111827",
    fontWeight: 600,
    fontSize: 14
  },
  description: {
    color: "#374151",
    lineHeight: 1.7,
    minHeight: 72,
    marginBottom: 18
  },
  statusRow: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 18
  },
  selectLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: 600
  },
  select: {
    padding: 10,
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 14
  },
  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap"
  },
  primaryButton: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "none",
    background: "#111827",
    color: "white",
    cursor: "pointer",
    fontWeight: 600
  },
  secondaryButton: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "white",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 600
  },
  deleteButton: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "none",
    background: "#dc2626",
    color: "white",
    cursor: "pointer",
    fontWeight: 600
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 10
  },
  emptyText: {
    color: "#6b7280",
    lineHeight: 1.7
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
    maxWidth: 760,
    background: "white",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 20px 40px rgba(0,0,0,0.18)"
  },
  modalTitle: {
    marginTop: 0,
    marginBottom: 10,
    color: "#111827"
  },
  modalText: {
    color: "#4b5563",
    lineHeight: 1.7,
    marginBottom: 16
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8
  },
  label: {
    fontSize: 14,
    color: "#374151",
    fontWeight: 600
  },
  input: {
    padding: 12,
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 14
  },
  modalActions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 20
  }
};