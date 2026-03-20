import { useEffect, useState } from "react";
import { API_URL } from "../services/api";
import AppLayout from "../components/AppLayout";

export default function JoburiUrmarite() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    const token = localStorage.getItem("token");

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/api/jobs`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (data.ok) {
        setJobs(data.jobs || []);
      } else {
        setMessage(data.error);
      }
    } catch (err) {
      console.error(err);
      setMessage("Eroare la încărcare.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteJob(id) {
    const token = localStorage.getItem("token");

    await fetch(`${API_URL}/api/jobs/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    fetchJobs();
  }

  async function generateRoadmap(jobId) {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(
        `${API_URL}/api/roadmaps/generate/${jobId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await res.json();

      if (res.ok) {
        alert("Roadmap generat!");
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function updateStatus(jobId, status) {
    const token = localStorage.getItem("token");

    await fetch(`${API_URL}/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });

    fetchJobs();
  }

  return (
    <AppLayout
      title="Joburi urmărite"
      subtitle="Gestionează joburile tale"
    >
      {loading ? (
        <div style={styles.card}>Se încarcă...</div>
      ) : jobs.length === 0 ? (
        <div style={styles.card}>Nu ai joburi salvate.</div>
      ) : (
        <div style={styles.grid}>
          {jobs.map((job) => (
            <div key={job.id} style={styles.card}>
              <h3>{job.title}</h3>
              <p>{job.company}</p>

              <div style={styles.score}>
                {job.match_score || 0}%
              </div>

              <p>{job.description}</p>

              <select
                value={job.status || "SALVAT"}
                onChange={(e) =>
                  updateStatus(job.id, e.target.value)
                }
              >
                <option value="SALVAT">Salvat</option>
                <option value="APLICAT">Aplicat</option>
                <option value="IN_PROCES">În proces</option>
              </select>

              <div style={styles.actions}>
                <button
                  onClick={() => generateRoadmap(job.id)}
                  style={styles.button}
                >
                  Generează roadmap
                </button>

                <button
                  onClick={() => deleteJob(job.id)}
                  style={styles.delete}
                >
                  Șterge
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px,1fr))",
    gap: 20
  },
  card: {
    background: "white",
    padding: 20,
    borderRadius: 12
  },
  score: {
    fontSize: 24,
    fontWeight: "bold"
  },
  actions: {
    marginTop: 10,
    display: "flex",
    gap: 10
  },
  button: {
    background: "#111827",
    color: "white",
    padding: 8,
    borderRadius: 6,
    border: "none"
  },
  delete: {
    background: "red",
    color: "white",
    padding: 8,
    border: "none",
    borderRadius: 6
  }
};