import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../services/api";

export default function ResetareParola() {
  const navigate = useNavigate();
  const { token } = useParams();

  const [parolaNoua, setParolaNoua] = useState("");
  const [confirmareParola, setConfirmareParola] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [tipMesaj, setTipMesaj] = useState("info");
  const [loading, setLoading] = useState(false);

  function seteazaMesaj(text, tip = "info") {
    setMesaj(text);
    setTipMesaj(tip);
  }

  function parolaEsteValida(value) {
    return String(value || "").length >= 8;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!token) {
      seteazaMesaj("Linkul de resetare nu conține un token valid.", "error");
      return;
    }

    if (!parolaNoua || !confirmareParola) {
      seteazaMesaj("Completează ambele câmpuri.", "error");
      return;
    }

    if (!parolaEsteValida(parolaNoua)) {
      seteazaMesaj("Parola trebuie să aibă minimum 8 caractere.", "error");
      return;
    }

    if (parolaNoua !== confirmareParola) {
      seteazaMesaj("Parolele nu coincid.", "error");
      return;
    }

    try {
      setLoading(true);
      seteazaMesaj("Se resetează parola...", "info");

      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token,
          newPassword: parolaNoua,
        }),
      });

      seteazaMesaj("Parola a fost resetată cu succes.", "success");

      setTimeout(() => {
        navigate("/autentificare");
      }, 1200);
    } catch (err) {
      console.error("RESET PASSWORD ERROR:", err);

      if (err.message === "Invalid or expired reset token") {
        seteazaMesaj("Linkul de resetare este invalid sau a expirat.", "error");
      } else {
        seteazaMesaj("Nu s-a putut reseta parola.", "error");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.icon}>🔒</div>

        <div style={styles.eyebrow}>SkillTrack</div>

        <h1 style={styles.title}>Resetare parolă</h1>

        <p style={styles.text}>
          Setează o parolă nouă pentru contul tău. Parola trebuie să aibă cel
          puțin 8 caractere.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.inputGroup}>
            Parolă nouă
            <input
              style={styles.input}
              type="password"
              placeholder="Minimum 8 caractere"
              value={parolaNoua}
              onChange={(e) => setParolaNoua(e.target.value)}
              disabled={loading}
            />
          </label>

          <label style={styles.inputGroup}>
            Confirmă parola
            <input
              style={styles.input}
              type="password"
              placeholder="Repetă parola"
              value={confirmareParola}
              onChange={(e) => setConfirmareParola(e.target.value)}
              disabled={loading}
            />
          </label>

          <button type="submit" style={styles.primaryButton} disabled={loading}>
            {loading ? "Se resetează..." : "Resetează parola"}
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
    fontSize: 30,
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
};