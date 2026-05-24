import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../services/api";

export default function VerificareEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Se verifică emailul...");

  useEffect(() => {
    verifyEmail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verifyEmail() {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Linkul de verificare nu conține un token valid.");
      return;
    }

    try {
      const data = await apiFetch(`/api/auth/verify-email?token=${token}`, {
        method: "GET"
      });

      setStatus("success");

      if (data.message === "Email already verified") {
        setMessage("Emailul este deja confirmat. Te poți autentifica.");
      } else {
        setMessage("Email confirmat cu succes. Contul tău este activ.");
      }
    } catch (err) {
      console.error("VERIFY EMAIL ERROR:", err);

      setStatus("error");

      if (err.message === "Invalid token") {
        setMessage("Linkul de verificare este invalid.");
      } else if (err.message === "Token expired") {
        setMessage("Linkul de verificare a expirat. Creează un cont nou sau cere retrimiterea confirmării.");
      } else {
        setMessage("Nu s-a putut confirma emailul. Încearcă din nou.");
      }
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div
          style={{
            ...styles.icon,
            ...(status === "success"
              ? styles.iconSuccess
              : status === "error"
                ? styles.iconError
                : styles.iconLoading)
          }}
        >
          {status === "success" ? "✓" : status === "error" ? "!" : "…"}
        </div>

        <div style={styles.eyebrow}>SkillTrack</div>

        <h1 style={styles.title}>
          {status === "success"
            ? "Email confirmat"
            : status === "error"
              ? "Verificare nereușită"
              : "Verificare email"}
        </h1>

        <p style={styles.text}>{message}</p>

        <div style={styles.actions}>
          <button
            type="button"
            style={styles.primaryButton}
            onClick={() => navigate("/autentificare")}
          >
            Mergi la autentificare
          </button>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => navigate("/")}
          >
            Înapoi la prezentare
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
    color: "#111827"
  },

  card: {
    width: "100%",
    maxWidth: 520,
    background: "#ffffff",
    borderRadius: 26,
    padding: 32,
    boxShadow: "0 30px 80px rgba(15, 23, 42, 0.14)",
    border: "1px solid #e5e7eb",
    textAlign: "center"
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
    fontWeight: 900
  },

  iconSuccess: {
    background: "#dcfce7",
    color: "#166534"
  },

  iconError: {
    background: "#fee2e2",
    color: "#991b1b"
  },

  iconLoading: {
    background: "#eef2ff",
    color: "#3730a3"
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: 900,
    color: "#4f46e5",
    textTransform: "uppercase",
    letterSpacing: 1.3,
    marginBottom: 8
  },

  title: {
    margin: 0,
    color: "#111827",
    fontSize: 32,
    letterSpacing: "-0.05em"
  },

  text: {
    margin: "12px auto 0",
    color: "#64748b",
    fontSize: 15,
    lineHeight: 1.7,
    maxWidth: 420
  },

  actions: {
    marginTop: 24,
    display: "flex",
    justifyContent: "center",
    gap: 10,
    flexWrap: "wrap"
  },

  primaryButton: {
    padding: "12px 15px",
    borderRadius: 13,
    border: "none",
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 900
  },

  secondaryButton: {
    padding: "12px 15px",
    borderRadius: 13,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 900
  }
};