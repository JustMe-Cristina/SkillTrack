import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";

export default function AiUitatParola() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [tipMesaj, setTipMesaj] = useState("info");
  const [devLink, setDevLink] = useState("");
  const [loading, setLoading] = useState(false);

  function seteazaMesaj(text, tip = "info") {
    setMesaj(text);
    setTipMesaj(tip);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const emailCurat = email.trim().toLowerCase();

    if (!emailCurat) {
      seteazaMesaj("Introdu adresa de email.", "error");
      return;
    }

    if (!emailCurat.includes("@")) {
      seteazaMesaj("Introdu o adresă de email validă.", "error");
      return;
    }

    try {
      setLoading(true);
      setDevLink("");
      seteazaMesaj("Se trimite linkul de resetare...", "info");

      const data = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({
          email: emailCurat,
        }),
      });

      seteazaMesaj(
        data.message || "Dacă emailul există, vei primi un link de resetare.",
        "success"
      );

      if (data.devResetLink) {
        setDevLink(data.devResetLink);
      }
    } catch (err) {
      console.error("FORGOT PASSWORD ERROR:", err);
      seteazaMesaj("Nu s-a putut trimite linkul de resetare.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.icon}>?</div>

        <div style={styles.eyebrow}>SkillTrack</div>

        <h1 style={styles.title}>Ai uitat parola?</h1>

        <p style={styles.text}>
          Introdu emailul asociat contului tău. Vei primi un link prin care poți
          seta o parolă nouă.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.inputGroup}>
            Email
            <input
              style={styles.input}
              type="email"
              placeholder="email@exemplu.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </label>

          <button type="submit" style={styles.primaryButton} disabled={loading}>
            {loading ? "Se trimite..." : "Trimite link de resetare"}
          </button>
        </form>

        {mesaj && (
          <div
            style={{
              ...styles.message,
              ...(tipMesaj === "success"
                ? styles.messageSuccess
                : tipMesaj === "error"
                  ? styles.messageError
                  : styles.messageInfo),
            }}
          >
            {mesaj}
          </div>
        )}

        {devLink && (
          <div style={styles.devBox}>
            <div style={styles.devLabel}>Link demo:</div>
            <a href={devLink} style={styles.devLink}>
              {devLink}
            </a>
          </div>
        )}

        <div style={styles.actions}>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => navigate("/autentificare")}
          >
            Înapoi la autentificare
          </button>
        </div>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    background:
      "radial-gradient(circle at top left, #eef2ff 0, transparent 34%), linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#111827",
  },

  card: {
    width: "100%",
    maxWidth: 540,
    background: "#ffffff",
    borderRadius: 26,
    padding: 32,
    boxShadow: "0 30px 80px rgba(15, 23, 42, 0.14)",
    border: "1px solid #e5e7eb",
    textAlign: "center",
  },

  icon: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    margin: "0 auto 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 34,
    fontWeight: 900,
    background: "#eef2ff",
    color: "#3730a3",
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: 900,
    color: "#4f46e5",
    textTransform: "uppercase",
    letterSpacing: 1.3,
    marginBottom: 8,
  },

  title: {
    margin: 0,
    color: "#111827",
    fontSize: 32,
    letterSpacing: "-0.05em",
  },

  text: {
    margin: "12px auto 0",
    color: "#64748b",
    fontSize: 15,
    lineHeight: 1.7,
    maxWidth: 440,
  },

  form: {
    marginTop: 24,
    display: "grid",
    gap: 12,
    textAlign: "left",
  },

  inputGroup: {
    display: "grid",
    gap: 6,
    color: "#475569",
    fontSize: 13,
    fontWeight: 800,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 13px",
    borderRadius: 13,
    border: "1px solid #d1d5db",
    fontSize: 14,
    outline: "none",
    background: "#ffffff",
    color: "#111827",
  },

  primaryButton: {
    padding: "12px 15px",
    borderRadius: 13,
    border: "none",
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 900,
  },

  secondaryButton: {
    padding: "12px 15px",
    borderRadius: 13,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 900,
  },

  actions: {
    marginTop: 18,
  },

  message: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    textAlign: "center",
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.5,
  },

  messageInfo: {
    background: "#eef2ff",
    color: "#3730a3",
    border: "1px solid #c7d2fe",
  },

  messageSuccess: {
    background: "#ecfdf5",
    color: "#166534",
    border: "1px solid #bbf7d0",
  },

  messageError: {
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca",
  },

  devBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    wordBreak: "break-all",
    textAlign: "left",
  },

  devLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 900,
    marginBottom: 6,
  },

  devLink: {
    color: "#4f46e5",
    fontSize: 13,
    fontWeight: 800,
  },
};