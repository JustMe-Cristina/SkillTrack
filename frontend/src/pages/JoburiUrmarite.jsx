import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

export default function JoburiUrmarite() {
  const [savedJobs, setSavedJobs] = useState([]);
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);
  const [editingJobId, setEditingJobId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("noi");

  const [editCompany, setEditCompany] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editWorkMode, setEditWorkMode] = useState("");
  const [editEmploymentType, setEditEmploymentType] = useState("");
  const [editStatus, setEditStatus] = useState("SALVAT");
  const [editAppliedAt, setEditAppliedAt] = useState("");
  const [editStartPeriod, setEditStartPeriod] = useState("");

  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("http://localhost:5050/api/jobs", {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (data.ok) {
        setSavedJobs(data.jobs || []);
      } else {
        setMessage("Nu s-au putut încărca joburile.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Eroare la încărcarea joburilor.");
    }
  }

  async function handleViewJobDetails(jobId) {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`http://localhost:5050/api/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (data.ok) {
        setSelectedJobDetails(data);
      } else {
        setMessage("Nu s-au putut încărca detaliile jobului.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Eroare la încărcarea detaliilor jobului.");
    }
  }

  async function handleDeleteJob(jobId) {
    if (!window.confirm("Sigur vrei să ștergi jobul?")) return;

    const token = localStorage.getItem("token");

    try {
      await fetch(`http://localhost:5050/api/jobs/${jobId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (selectedJobDetails?.job?.id === jobId) {
        setSelectedJobDetails(null);
      }

      fetchJobs();
    } catch (err) {
      console.error(err);
      setMessage("Eroare la ștergerea jobului.");
    }
  }

  function startEditJob(job) {
    setEditingJobId(job.id);
    setEditCompany(job.company || "");
    setEditLocation(job.location || "");
    setEditWorkMode(job.work_mode || "");
    setEditEmploymentType(job.employment_type || "");
    setEditStatus(job.status || "SALVAT");
    setEditAppliedAt(job.applied_at ? String(job.applied_at).slice(0, 10) : "");
    setEditStartPeriod(job.start_period || "");
  }

  function cancelEdit() {
    setEditingJobId(null);
    setEditCompany("");
    setEditLocation("");
    setEditWorkMode("");
    setEditEmploymentType("");
    setEditStatus("SALVAT");
    setEditAppliedAt("");
    setEditStartPeriod("");
  }

  function formatWorkMode(mode) {
    if (mode === "REMOTE") return "Remote";
    if (mode === "HYBRID") return "Hibrid";
    if (mode === "ONSITE") return "La fața locului";
    return "-";
  }

  function formatEmploymentType(type) {
    if (type === "FULL_TIME") return "Normă întreagă";
    if (type === "PART_TIME") return "Normă parțială";
    if (type === "INTERNSHIP") return "Internship";
    return "-";
  }

  async function handleUpdateJob(jobId) {
    if (!editLocation.trim()) {
      setMessage("Locația este obligatorie.");
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`http://localhost:5050/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          company: editCompany,
          location: editLocation,
          work_mode: editWorkMode,
          employment_type: editEmploymentType,
          status: editStatus,
          applied_at: editAppliedAt,
          start_period: editStartPeriod
        })
      });

      const data = await res.json();

      if (data.ok) {
        setMessage("Jobul a fost actualizat.");
        cancelEdit();
        fetchJobs();

        if (selectedJobDetails?.job?.id === jobId) {
          handleViewJobDetails(jobId);
        }
      } else {
        setMessage(data.error || "Nu s-a putut actualiza jobul.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Eroare la actualizarea jobului.");
    }
  }

  function statusLabel(status) {
    switch (status) {
      case "SALVAT":
        return "Salvat";
      case "APLICAT":
        return "Aplicat";
      case "IN_PROCES":
        return "În proces";
      case "RESPINS":
        return "Respins";
      case "ACCEPTAT":
        return "Acceptat";
      default:
        return status;
    }
  }

  const filteredJobs = useMemo(() => {
    const term = searchTerm.toLowerCase();

    let jobs = savedJobs.filter((job) =>
      job.title?.toLowerCase().includes(term) ||
      job.company?.toLowerCase().includes(term) ||
      job.location?.toLowerCase().includes(term) ||
      job.description?.toLowerCase().includes(term) ||
      job.status?.toLowerCase().includes(term)
    );

    switch (sortBy) {
      case "scor_desc":
        jobs.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
        break;

      case "scor_asc":
        jobs.sort((a, b) => (a.match_score || 0) - (b.match_score || 0));
        break;

      case "companie":
        jobs.sort((a, b) => (a.company || "").localeCompare(b.company || ""));
        break;

      case "titlu":
        jobs.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        break;

      case "vechi":
        jobs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;

      default:
        jobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return jobs;
  }, [savedJobs, searchTerm, sortBy]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Joburi urmărite</h1>

        <div style={styles.nav}>
          <Link to="/analiza" style={styles.link}>Analiza jobului</Link>
          <Link to="/competente" style={styles.link}>Competențele mele</Link>
          <Link to="/roadmaps" style={styles.link}>Planuri de dezvoltare</Link>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.filters}>
          <input
            placeholder="Caută job..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.input}
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={styles.input}
          >
            <option value="noi">Cele mai noi</option>
            <option value="vechi">Cele mai vechi</option>
            <option value="scor_desc">Scor descrescător</option>
            <option value="scor_asc">Scor crescător</option>
            <option value="companie">Companie</option>
            <option value="titlu">Titlu</option>
          </select>
        </div>

        {message && <div style={styles.message}>{message}</div>}

        {filteredJobs.length === 0 ? (
          <p>Nu există joburi salvate.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Job</th>
                <th style={styles.th}>Companie</th>
                <th style={styles.th}>Locație</th>
                <th style={styles.th}>Mod de lucru</th>
                <th style={styles.th}>Tip angajare</th>
                <th style={styles.th}>Scor</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Acțiuni</th>
              </tr>
            </thead>

            <tbody>
              {filteredJobs.map((job) => (
                <tr key={job.id}>
                  <td style={styles.td}>{job.title}</td>

                  <td style={styles.td}>
                    {editingJobId === job.id ? (
                      <input
                        value={editCompany}
                        onChange={(e) => setEditCompany(e.target.value)}
                        style={styles.smallInput}
                      />
                    ) : (
                      job.company || "-"
                    )}
                  </td>

                  <td style={styles.td}>
                    {editingJobId === job.id ? (
                      <input
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        style={styles.smallInput}
                      />
                    ) : (
                      job.location || "-"
                    )}
                  </td>

                  <td style={styles.td}>
                    {editingJobId === job.id ? (
                      <select
                        value={editWorkMode}
                        onChange={(e) => setEditWorkMode(e.target.value)}
                        style={styles.smallInput}
                      >
                        <option value="">-</option>
                        <option value="REMOTE">Remote</option>
                        <option value="HYBRID">Hibrid</option>
                        <option value="ONSITE">La fața locului</option>
                      </select>
                    ) : (
                      formatWorkMode(job.work_mode)
                    )}
                  </td>

                  <td style={styles.td}>
                    {editingJobId === job.id ? (
                      <select
                        value={editEmploymentType}
                        onChange={(e) => setEditEmploymentType(e.target.value)}
                        style={styles.smallInput}
                      >
                        <option value="">-</option>
                        <option value="FULL_TIME">Normă întreagă</option>
                        <option value="PART_TIME">Normă parțială</option>
                        <option value="INTERNSHIP">Internship</option>
                      </select>
                    ) : (
                      formatEmploymentType(job.employment_type)
                    )}
                  </td>

                  <td style={styles.td}>{job.match_score ?? 0}%</td>

                  <td style={styles.td}>
                    {editingJobId === job.id ? (
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        style={styles.smallInput}
                      >
                        <option value="SALVAT">Salvat</option>
                        <option value="APLICAT">Aplicat</option>
                        <option value="IN_PROCES">În proces</option>
                        <option value="RESPINS">Respins</option>
                        <option value="ACCEPTAT">Acceptat</option>
                      </select>
                    ) : (
                      statusLabel(job.status)
                    )}
                  </td>

                  <td style={styles.td}>
                    {editingJobId === job.id ? (
                      <div style={styles.actions}>
                        <button style={styles.actionButton} onClick={() => handleUpdateJob(job.id)}>
                          Salvează
                        </button>
                        <button style={styles.actionButtonSecondary} onClick={cancelEdit}>
                          Anulează
                        </button>
                      </div>
                    ) : (
                      <div style={styles.actions}>
                        <button style={styles.actionButton} onClick={() => handleViewJobDetails(job.id)}>
                          Detalii
                        </button>
                        <button style={styles.actionButton} onClick={() => startEditJob(job)}>
                          Editează
                        </button>
                        <button style={styles.deleteButton} onClick={() => handleDeleteJob(job.id)}>
                          Șterge
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {editingJobId && (
          <div style={styles.editInfoBox}>
            <h3 style={{ marginTop: 0 }}>Date suplimentare pentru jobul editat</h3>

            <div style={styles.editExtraGrid}>
              <div>
                <label style={styles.label}>Data aplicării</label>
                <input
                  type="date"
                  value={editAppliedAt}
                  onChange={(e) => setEditAppliedAt(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>Perioadă de început</label>
                <input
                  value={editStartPeriod}
                  onChange={(e) => setEditStartPeriod(e.target.value)}
                  placeholder="Ex: Aprilie 2026"
                  style={styles.input}
                />
              </div>
            </div>
          </div>
        )}

        {selectedJobDetails && (
          <div style={styles.details}>
            <h2 style={styles.detailsTitle}>Detalii job</h2>

            <p><b>Titlu:</b> {selectedJobDetails.job.title}</p>
            <p><b>Companie:</b> {selectedJobDetails.job.company || "-"}</p>
            <p><b>Locație:</b> {selectedJobDetails.job.location || "-"}</p>
            <p><b>Mod de lucru:</b> {formatWorkMode(selectedJobDetails.job.work_mode)}</p>
            <p><b>Tip angajare:</b> {formatEmploymentType(selectedJobDetails.job.employment_type)}</p>
            <p><b>Status:</b> {statusLabel(selectedJobDetails.job.status)}</p>
            <p><b>Scor recalculat:</b> {selectedJobDetails.dynamicScore}%</p>

            {selectedJobDetails.job.applied_at && (
              <p><b>Data aplicării:</b> {String(selectedJobDetails.job.applied_at).slice(0, 10)}</p>
            )}

            {selectedJobDetails.job.start_period && (
              <p><b>Perioadă de început:</b> {selectedJobDetails.job.start_period}</p>
            )}

            <h3>Competențe acoperite</h3>
            {selectedJobDetails.matches.length === 0 ? (
              <p>Nu există competențe acoperite.</p>
            ) : (
              <ul>
                {selectedJobDetails.matches.map((m, i) => (
                  <li key={i}>{m.skill}</li>
                ))}
              </ul>
            )}

            <h3>Competențe de dezvoltat</h3>
            {selectedJobDetails.gaps.length === 0 ? (
              <p>Nu există competențe de dezvoltat.</p>
            ) : (
              <ul>
                {selectedJobDetails.gaps.map((g, i) => (
                  <li key={i}>{g.skill}</li>
                ))}
              </ul>
            )}

            <h3>Descriere completă</h3>
            <div style={styles.description}>
              {selectedJobDetails.job.description}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    padding: 30,
    background: "#f4f6f9",
    minHeight: "100vh",
    fontFamily: "Inter, sans-serif"
  },
  header: {
    maxWidth: 1300,
    margin: "0 auto 20px auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap"
  },
  title: {
    margin: 0,
    color: "#111827"
  },
  nav: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap"
  },
  link: {
    textDecoration: "none",
    color: "#111827",
    background: "white",
    padding: "10px 14px",
    borderRadius: 8,
    fontWeight: 500
  },
  card: {
    maxWidth: 1300,
    margin: "0 auto",
    background: "white",
    padding: 24,
    borderRadius: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
  },
  filters: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
    flexWrap: "wrap"
  },
  input: {
    padding: 10,
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 14
  },
  smallInput: {
    padding: 8,
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 13,
    width: "100%"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse"
  },
  th: {
    textAlign: "left",
    padding: 12,
    borderBottom: "1px solid #e5e7eb",
    background: "#f9fafb"
  },
  td: {
    padding: 12,
    borderBottom: "1px solid #e5e7eb",
    verticalAlign: "top"
  },
  actions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap"
  },
  actionButton: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "none",
    background: "#111827",
    color: "white",
    cursor: "pointer",
    fontWeight: 500
  },
  actionButtonSecondary: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "white",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 500
  },
  deleteButton: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "none",
    background: "#b91c1c",
    color: "white",
    cursor: "pointer",
    fontWeight: 500
  },
  message: {
    marginBottom: 16,
    color: "#4b5563"
  },
  details: {
    marginTop: 30,
    background: "#fafafa",
    padding: 20,
    borderRadius: 12,
    border: "1px solid #e5e7eb"
  },
  detailsTitle: {
    marginTop: 0
  },
  description: {
    background: "white",
    padding: 15,
    border: "1px solid #ddd",
    borderRadius: 10,
    whiteSpace: "pre-wrap"
  },
  editInfoBox: {
    marginTop: 24,
    background: "#f9fafb",
    padding: 20,
    borderRadius: 12,
    border: "1px solid #e5e7eb"
  },
  editExtraGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16
  },
  label: {
    display: "block",
    marginBottom: 8,
    fontWeight: 600,
    color: "#111827"
  }
};