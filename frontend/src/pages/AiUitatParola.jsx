import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";

export default function AiUitatParola() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [devLink, setDevLink] = useState("");
  const [loading, setLoading] = useState(false);

  function showMessage(text, type = "info") {
    setMessage(text);
    setMessageType(type);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      showMessage("Introdu adresa de email.", "error");
      return;
    }

    if (!cleanEmail.includes("@")) {
      showMessage("Introdu o adresă de email validă.", "error");
      return;
    }

    try {
      setLoading(true);
      setDevLink("");
      showMessage("Se trimite linkul de resetare...", "info");

      const data = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({
          email: cleanEmail
        })
      });

      showMessage(
        data.message ||
          "Dacă emailul există, vei primi un link de resetare.",
        "success"
      );

      if (data.devResetLink) {
        setDevLink(data.devResetLink);
      }
    } catch (err) {
      console.error("FORGOT PASSWORD ERROR:", err);

      showMessage(
        err.message || "Nu s-a putut trimite linkul de resetare.",
        "error"
      );
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
          Introdu adresa de email asociată contului tău. Vei primi un link prin
          care îți poți seta o parolă nouă.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.inputGroup}>
            Email
            <input
              type="email"
              placeholder="email@exemplu.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              style={styles.input}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={styles.primaryButton}
          >
            {loading ? "Se trimite..." : "Trimite link de resetare"}
          </button>
        </form>

        {message && (
          <div
            style={{
              ...styles.message,
              ...(messageType === "success"
                ? styles.messageSuccess
                : messageType === "error"
                  ? styles.messageError
                  : styles.messageInfo)
            }}
          >
            {message}
          </div>
        )}

        {devLink && (
          <div style={styles.devBox}>
            <div style={styles.devLabel}>Link demo</div>

            <a
              href={devLink}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.devLink}
            >
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
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    background:
      "radial-gradient(circle at top left, #eef2ff 0, transparent 34%), linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#111827"
  },

  card: {
    width: "100%",
    maxWidth: 540,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 26,
    padding: 32,
    textAlign: "center",
    boxShadow: "0 30px 80px rgba(15,23,42,0.14)"
  },

  icon: {
    width: 72,
    height: 72,
    margin: "0 auto 18px",
    borderRadius: "50%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#eef2ff",
    color: "#3730a3",
    fontSize: 34,
    fontWeight: 900
  },

  eyebrow: {
    marginBottom: 8,
    color: "#4f46e5",
    fontSize: 11,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 1.3
  },

  title: {
    margin: 0,
    fontSize: 32,
    fontWeight: 900,
    color: "#111827",
    letterSpacing: "-0.05em"
  },

  text: {
    margin: "12px auto 0",
    maxWidth: 440,
    color: "#64748b",
    fontSize: 15,
    lineHeight: 1.7
  },

  form: {
    marginTop: 24,
    display: "grid",
    gap: 12,
    textAlign: "left"
  },

  inputGroup: {
    display: "grid",
    gap: 6,
    color: "#475569",
    fontSize: 13,
    fontWeight: 700
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 13px",
    border: "1px solid #d1d5db",
    borderRadius: 13,
    background: "#ffffff",
    color: "#111827",
    fontSize: 14,
    outline: "none"
  },

  primaryButton: {
    padding: "12px 15px",
    border: "none",
    borderRadius: 13,
    background: "#111827",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer"
  },

  secondaryButton: {
    padding: "12px 15px",
    border: "1px solid #d1d5db",
    borderRadius: 13,
    background: "#ffffff",
    color: "#111827",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer"
  },

  actions: {
    marginTop: 18
  },

  message: {
    marginTop: 16,
    padding: 13,
    borderRadius: 14,
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.5,
    textAlign: "center"
  },

  messageInfo: {
    background: "#eef2ff",
    color: "#3730a3",
    border: "1px solid #c7d2fe"
  },

  messageSuccess: {
    background: "#ecfdf5",
    color: "#166534",
    border: "1px solid #bbf7d0"
  },

  messageError: {
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca"
  },

  devBox: {
    marginTop: 16,
    padding: 14,
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    background: "#f8fafc",
    textAlign: "left",
    wordBreak: "break-word"
  },

  devLabel: {
    marginBottom: 6,
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800
  },

  devLink: {
    color: "#4f46e5",
    fontSize: 13,
    fontWeight: 700,
    textDecoration: "none"
  }
};