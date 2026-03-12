import { useState } from "react";
import { Link } from "react-router-dom";

export default function AnalizaJob() {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");

  async function handleAnalyze(e) {
    e.preventDefault();
    setMessage("Se analizează jobul...");
    setResult(null);

    const token = localStorage.getItem("token");

    try {
      const res = await fetch("http://localhost:5050/api/jobs/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          company,
          location,
          work_mode: workMode,
          employment_type: employmentType,
          description
        })
      });

      const data = await res.json();

      if (data.ok) {
        setResult(data);
        setMessage("");

        if (data.location) {
          setLocation(data.location);
        }

        if (data.work_mode) {
          setWorkMode(data.work_mode);
        }

        if (data.employment_type) {
          setEmploymentType(data.employment_type);
        }
      } else {
        setMessage(traducereMesaj(data.error));
      }
    } catch (err) {
      console.error(err);
      setMessage("Eroare la analiză.");
    }
  }

  async function handleSaveJob() {
    if (!result) return;

    if (!location.trim()) {
      setMessage("Locația este obligatorie.");
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const res = await fetch("http://localhost:5050/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          company,
          location,
          work_mode: workMode,
          employment_type: employmentType,
          description,
          score: result.score,
          detectedSkills: result.detectedSkills
        })
      });

      const data = await res.json();

      if (data.ok) {
        setMessage("Jobul a fost salvat.");
        setResult(null);
        setTitle("");
        setCompany("");
        setLocation("");
        setWorkMode("");
        setEmploymentType("");
        setDescription("");
      } else {
        setMessage(traducereMesaj(data.error));
      }
    } catch (err) {
      console.error(err);
      setMessage("Eroare la salvarea jobului.");
    }
  }

  function traducereMesaj(msg) {
    if (!msg) return "A apărut o eroare.";
    if (msg === "Missing title/description") return "Titlul sau descrierea lipsesc.";
    if (msg === "Missing location") return "Locația lipsește.";
    if (msg === "Server error") return "Eroare de server.";
    return msg;
  }

  function formatWorkMode(mode) {
    if (mode === "REMOTE") return "Remote";
    if (mode === "HYBRID") return "Hibrid";
    if (mode === "ONSITE") return "La fața locului";
    return mode || "-";
  }

  function formatEmploymentType(type) {
    if (type === "FULL_TIME") return "Normă întreagă";
    if (type === "PART_TIME") return "Normă fracționată";
    if (type === "INTERNSHIP") return "Internship";
    return type || "-";
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Analiza jobului</h1>
        <div style={styles.nav}>
          <Link to="/competente" style={styles.link}>Competențele mele</Link>
          <Link to="/joburi" style={styles.link}>Joburi urmărite</Link>
          <Link to="/roadmaps" style={styles.link}>Planuri de dezvoltare</Link>
        </div>
      </div>

      <div style={styles.card}>
        <form onSubmit={handleAnalyze} style={styles.form}>
          <input
            style={styles.input}
            placeholder="Titlul jobului"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <input
            style={styles.input}
            placeholder="Compania"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />

          <input
            style={styles.input}
            placeholder="Locație"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />

          <select
            style={styles.input}
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value)}
          >
            <option value="">Mod de lucru</option>
            <option value="REMOTE">Remote</option>
            <option value="HYBRID">Hibrid</option>
            <option value="ONSITE">La fața locului</option>
          </select>

          <select
            style={styles.input}
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value)}
          >
            <option value="">Tip angajare</option>
            <option value="FULL_TIME">Normă întreagă</option>
            <option value="PART_TIME">Normă fracționată</option>
            <option value="INTERNSHIP">Internship</option>
          </select>

          <textarea
            style={styles.textarea}
            placeholder="Introdu descrierea jobului..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <button type="submit" style={styles.button}>
            Analizează
          </button>
        </form>

        {message && <div style={styles.message}>{message}</div>}

        {result && (
          <div style={styles.result}>
            <h2 style={styles.score}>Scor de potrivire: {result.score ?? 0}%</h2>

            <div style={styles.infoBox}>
              <p style={styles.infoText}>
                <strong>Locație:</strong> {location || "-"}
              </p>
              <p style={styles.infoText}>
                <strong>Mod de lucru:</strong> {formatWorkMode(workMode)}
              </p>
              <p style={styles.infoText}>
                <strong>Tip angajare:</strong> {formatEmploymentType(employmentType)}
              </p>
            </div>

            <h3>Competențe de dezvoltat</h3>
            {(result.gaps || []).length === 0 ? (
              <p>Nu există competențe de dezvoltat.</p>
            ) : (
              <ul>
                {(result.gaps || []).map((g, i) => (
                  <li key={i}>{g.skill}</li>
                ))}
              </ul>
            )}

            <h3>Competențe acoperite</h3>
            {(result.matches || []).length === 0 ? (
              <p>Nu există competențe acoperite.</p>
            ) : (
              <ul>
                {(result.matches || []).map((m, i) => (
                  <li key={i}>{m.skill}</li>
                ))}
              </ul>
            )}

            <button type="button" style={styles.button} onClick={handleSaveJob}>
              Salvează jobul
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f4f6f9",
    padding: 24,
    fontFamily: "Inter, sans-serif"
  },
  header: {
    maxWidth: 900,
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
    maxWidth: 900,
    margin: "0 auto",
    background: "white",
    padding: 24,
    borderRadius: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
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
    minHeight: 140,
    padding: 12,
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 14,
    resize: "vertical"
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
  message: {
    marginTop: 16,
    color: "#4b5563"
  },
  result: {
    marginTop: 24,
    padding: 20,
    background: "#f9fafb",
    borderRadius: 12
  },
  score: {
    marginTop: 0
  },
  infoBox: {
    marginBottom: 20,
    padding: 14,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 10
  },
  infoText: {
    margin: "6px 0",
    color: "#374151"
  }
};