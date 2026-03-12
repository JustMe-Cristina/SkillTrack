import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function PlanuriDeDezvoltare() {
  const [planuri, setPlanuri] = useState([]);
  const [joburiSalvate, setJoburiSalvate] = useState([]);
  const [jobSelectatId, setJobSelectatId] = useState("");
  const [planSelectat, setPlanSelectat] = useState(null);
  const [pasi, setPasi] = useState([]);
  const [mesaj, setMesaj] = useState("");
  const [seIncarcaPlanuri, setSeIncarcaPlanuri] = useState(false);
  const [seIncarcaDetalii, setSeIncarcaDetalii] = useState(false);
  const [seGenereaza, setSeGenereaza] = useState(false);

  const API_BASE = "http://localhost:5050/api";

  useEffect(() => {
    incarcaPlanuri();
    incarcaJoburi();
  }, []);

  async function incarcaPlanuri() {
    const token = localStorage.getItem("token");
    setSeIncarcaPlanuri(true);

    try {
      const res = await fetch(`${API_BASE}/roadmaps`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setPlanuri(data);
      } else {
        setMesaj(data.message || "Eroare la încărcarea planurilor de dezvoltare.");
      }
    } catch (err) {
      console.error(err);
      setMesaj("Eroare la încărcarea planurilor de dezvoltare.");
    } finally {
      setSeIncarcaPlanuri(false);
    }
  }

  async function incarcaJoburi() {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API_BASE}/jobs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.ok) {
        setJoburiSalvate(data.jobs || []);
      } else {
        setMesaj("Eroare la încărcarea joburilor.");
      }
    } catch (err) {
      console.error(err);
      setMesaj("Eroare la încărcarea joburilor.");
    }
  }

  async function incarcaDetaliiPlan(planId) {
    const token = localStorage.getItem("token");
    setSeIncarcaDetalii(true);

    try {
      const res = await fetch(`${API_BASE}/roadmaps/${planId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setPlanSelectat(data.roadmap);
        setPasi(data.steps || []);
      } else {
        setMesaj(data.message || "Eroare la încărcarea detaliilor planului.");
      }
    } catch (err) {
      console.error(err);
      setMesaj("Eroare la încărcarea detaliilor planului.");
    } finally {
      setSeIncarcaDetalii(false);
    }
  }

 async function genereazaPlan() {
  if (!jobSelectatId) {
    setMesaj("Selectează un job.");
    return;
  }

  const token = localStorage.getItem("token");
  setSeGenereaza(true);
  setMesaj("");

  try {
    const res = await fetch(`${API_BASE}/roadmaps/generate/${jobSelectatId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (res.ok) {
      setMesaj(data.message || "Planul de dezvoltare a fost generat cu succes.");

      await incarcaPlanuri();

      if (data.roadmap_id) {
        await incarcaDetaliiPlan(data.roadmap_id);
      }
    } else {
      // aici intră cazul când există deja planul

      setMesaj(data.message || "Există deja un plan pentru acest job.");

      if (data.roadmap_id) {
        await incarcaDetaliiPlan(data.roadmap_id);
      }
    }
  } catch (err) {
    console.error(err);
    setMesaj("Eroare la generarea planului de dezvoltare.");
  } finally {
    setSeGenereaza(false);
  }
}

  async function actualizeazaStatusPas(stepId, status) {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API_BASE}/roadmaps/steps/${stepId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();

      if (res.ok) {
        if (planSelectat?.id) {
          await incarcaDetaliiPlan(planSelectat.id);
          await incarcaPlanuri();
        }
      } else {
        setMesaj(data.message || "Nu s-a putut actualiza pasul.");
      }
    } catch (err) {
      console.error(err);
      setMesaj("Eroare la actualizarea pasului.");
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Planuri de dezvoltare</h1>

        <div style={styles.nav}>
          <Link to="/analiza" style={styles.link}>
            Analiza jobului
          </Link>
          <Link to="/competente" style={styles.link}>
            Competențele mele
          </Link>
          <Link to="/joburi" style={styles.link}>
            Joburi urmărite
          </Link>
        </div>
      </div>

      <div style={styles.mainGrid}>
        <div style={styles.sidebarCard}>
          <h2 style={styles.sectionTitle}>Generează plan de dezvoltare</h2>

          <select
            value={jobSelectatId}
            onChange={(e) => setJobSelectatId(e.target.value)}
            style={styles.input}
          >
            <option value="">Selectează un job</option>
            {joburiSalvate.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} {job.company ? `- ${job.company}` : ""}
              </option>
            ))}
          </select>

          <button
            onClick={genereazaPlan}
            style={styles.button}
            disabled={seGenereaza}
          >
            {seGenereaza ? "Se generează..." : "Generează plan de dezvoltare"}
          </button>

          {mesaj && <p style={styles.message}>{mesaj}</p>}

          <hr style={styles.divider} />

          <h2 style={styles.sectionTitle}>Planurile mele de dezvoltare</h2>

          {seIncarcaPlanuri ? (
            <p>Se încarcă...</p>
          ) : planuri.length === 0 ? (
            <p>Nu există planuri de dezvoltare încă.</p>
          ) : (
            planuri.map((plan) => (
              <div
                key={plan.id}
                style={{
                  ...styles.planItem,
                  border:
                    planSelectat?.id === plan.id
                      ? "2px solid #111827"
                      : "1px solid #e5e7eb",
                }}
                onClick={() => incarcaDetaliiPlan(plan.id)}
              >
                <h3 style={{ margin: "0 0 8px 0" }}>{plan.title}</h3>
                <p style={styles.smallText}>
                  <strong>Job:</strong> {plan.job_title}
                </p>
                <p style={styles.smallText}>
                  <strong>Companie:</strong> {plan.company || "-"}
                </p>
                <p style={styles.smallText}>
                  <strong>Stare:</strong> {formatStatus(plan.status)}
                </p>
                <p style={styles.smallText}>
                  <strong>Progres:</strong> {plan.progress}%
                </p>
              </div>
            ))
          )}
        </div>

        <div style={styles.contentCard}>
          {!planSelectat ? (
            <p>Selectează un plan din stânga.</p>
          ) : seIncarcaDetalii ? (
            <p>Se încarcă detaliile planului de dezvoltare...</p>
          ) : (
            <>
              <h2 style={styles.sectionTitle}>{planSelectat.title}</h2>

              <p>
                <strong>Job:</strong> {planSelectat.job_title}
              </p>
              <p>
                <strong>Stare:</strong> {formatStatus(planSelectat.status)}
              </p>
              <p>
                <strong>Progres:</strong> {planSelectat.progress}%
              </p>

              <div style={styles.progressBarOuter}>
                <div
                  style={{
                    ...styles.progressBarInner,
                    width: `${planSelectat.progress || 0}%`,
                  }}
                />
              </div>

              <h3 style={{ marginTop: 24 }}>Pașii planului de dezvoltare</h3>

              {pasi.length === 0 ? (
                <p>Nu există pași pentru acest plan.</p>
              ) : (
                pasi.map((pas) => (
                  <div
                    key={pas.id}
                    style={{
                      ...styles.stepCard,
                      borderLeft: getStatusBorder(pas.status),
                    }}
                  >
                    <h4 style={{ marginTop: 0 }}>
                      {pas.step_order}. {pas.title}
                    </h4>

                    <p>{pas.description}</p>

                    <p style={styles.smallText}>
                      <strong>Competență:</strong> {pas.skill_name || "-"}
                    </p>

                    <div style={styles.statusRow}>
                      <label>
                        <strong>Stare:</strong>
                      </label>
                      <select
                        value={pas.status}
                        onChange={(e) =>
                          actualizeazaStatusPas(pas.id, e.target.value)
                        }
                        style={styles.statusSelect}
                      >
                        <option value="NOT_STARTED">Neînceput</option>
                        <option value="IN_PROGRESS">În curs</option>
                        <option value="COMPLETED">Finalizat</option>
                      </select>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatStatus(status) {
  if (status === "NOT_STARTED") return "Neînceput";
  if (status === "IN_PROGRESS") return "În curs";
  if (status === "COMPLETED") return "Finalizat";
  return status;
}

function getStatusBorder(status) {
  if (status === "COMPLETED") return "5px solid #16a34a";
  if (status === "IN_PROGRESS") return "5px solid #f59e0b";
  return "5px solid #9ca3af";
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f4f6f9",
    padding: 24,
    fontFamily: "Inter, sans-serif",
  },
  header: {
    maxWidth: 1300,
    margin: "0 auto 20px auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    color: "#111827",
  },
  nav: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  link: {
    textDecoration: "none",
    color: "#111827",
    background: "white",
    padding: "10px 14px",
    borderRadius: 8,
    fontWeight: 500,
  },
  mainGrid: {
    maxWidth: 1300,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "340px 1fr",
    gap: 20,
  },
  sidebarCard: {
    background: "white",
    padding: 20,
    borderRadius: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    height: "fit-content",
  },
  contentCard: {
    background: "white",
    padding: 24,
    borderRadius: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    minHeight: 500,
  },
  sectionTitle: {
    marginTop: 0,
    color: "#111827",
  },
  input: {
    width: "100%",
    padding: 12,
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 14,
    marginBottom: 12,
  },
  button: {
    width: "100%",
    padding: 12,
    borderRadius: 8,
    border: "none",
    background: "#111827",
    color: "white",
    cursor: "pointer",
    fontWeight: 600,
  },
  message: {
    marginTop: 12,
    color: "#4b5563",
  },
  divider: {
    margin: "20px 0",
  },
  planItem: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    cursor: "pointer",
    background: "#f9fafb",
  },
  stepCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    background: "#f9fafb",
  },
  smallText: {
    fontSize: 14,
    color: "#374151",
    margin: "4px 0",
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  statusSelect: {
    padding: 8,
    borderRadius: 8,
    border: "1px solid #d1d5db",
  },
  progressBarOuter: {
    width: "100%",
    height: 12,
    background: "#e5e7eb",
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 10,
  },
  progressBarInner: {
    height: "100%",
    background: "#111827",
  },
};