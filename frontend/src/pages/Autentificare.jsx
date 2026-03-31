import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";

export default function Autentificare() {
  const navigate = useNavigate();

  const [mod, setMod] = useState("login");
  const [nume, setNume] = useState("");
  const [email, setEmail] = useState("");
  const [parola, setParola] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleInregistrare(e) {
    e.preventDefault();
    setMesaj("Se creează contul...");

    try {
      setLoading(true);

      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: nume.trim(),
          email: email.trim(),
          password: parola
        })
      });

      setMesaj("Cont creat cu succes. Te poți autentifica.");
      setMod("login");
      setNume("");
      setEmail("");
      setParola("");
    } catch (err) {
      console.error("REGISTER ERROR:", err);
      setMesaj(traducereMesaj(err.message));
    } finally {
      setLoading(false);
    }
  }

  async function handleAutentificare(e) {
    e.preventDefault();
    setMesaj("Se realizează autentificarea...");

    try {
      setLoading(true);

      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password: parola
        })
      });

      localStorage.setItem("token", data.token);
      navigate("/panou");
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      setMesaj(traducereMesaj(err.message));
    } finally {
      setLoading(false);
    }
  }

  function traducereMesaj(msg) {
    if (!msg) return "A apărut o eroare.";
    if (msg === "Missing fields") return "Câmpuri lipsă.";
    if (msg === "Invalid credentials") return "Date de autentificare incorecte.";
    if (msg === "Email already in use") return "Emailul este deja folosit.";
    if (msg === "Server error") return "Eroare de server.";
    return msg;
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.logo}>SkillTrack</h1>
        <p style={styles.subtitle}>
          Platformă pentru analiză de competențe și job matching
        </p>

        <div style={styles.switch}>
          <button
            type="button"
            style={mod === "login" ? styles.activeTab : styles.tab}
            onClick={() => setMod("login")}
            disabled={loading}
          >
            Autentificare
          </button>

          <button
            type="button"
            style={mod === "register" ? styles.activeTab : styles.tab}
            onClick={() => setMod("register")}
            disabled={loading}
          >
            Înregistrare
          </button>
        </div>

        {mod === "register" && (
          <form onSubmit={handleInregistrare} style={styles.form}>
            <input
              style={styles.input}
              placeholder="Nume"
              value={nume}
              onChange={(e) => setNume(e.target.value)}
              disabled={loading}
            />

            <input
              style={styles.input}
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />

            <input
              style={styles.input}
              type="password"
              placeholder="Parolă"
              value={parola}
              onChange={(e) => setParola(e.target.value)}
              disabled={loading}
            />

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "Se creează..." : "Creează cont"}
            </button>
          </form>
        )}

        {mod === "login" && (
          <form onSubmit={handleAutentificare} style={styles.form}>
            <input
              style={styles.input}
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />

            <input
              style={styles.input}
              type="password"
              placeholder="Parolă"
              value={parola}
              onChange={(e) => setParola(e.target.value)}
              disabled={loading}
            />

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "Se autentifică..." : "Autentificare"}
            </button>
          </form>
        )}

        {mesaj && <div style={styles.message}>{mesaj}</div>}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f6f9",
    padding: 24,
    fontFamily: "Inter, sans-serif"
  },
  card: {
    width: "100%",
    maxWidth: 440,
    background: "white",
    padding: 32,
    borderRadius: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
  },
  logo: {
    textAlign: "center",
    margin: 0,
    color: "#111827"
  },
  subtitle: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 14,
    marginTop: 8,
    marginBottom: 24
  },
  switch: {
    display: "flex",
    gap: 8,
    marginBottom: 20
  },
  tab: {
    flex: 1,
    padding: 10,
    border: "none",
    borderRadius: 8,
    background: "#e5e7eb",
    cursor: "pointer",
    fontWeight: 500
  },
  activeTab: {
    flex: 1,
    padding: 10,
    border: "none",
    borderRadius: 8,
    background: "#111827",
    color: "white",
    cursor: "pointer",
    fontWeight: 600
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
    textAlign: "center",
    color: "#4b5563",
    fontSize: 14
  }
};