import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Autentificare() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const [mod, setMod] = useState(
    searchParams.get("mode") === "register" ? "register" : "login"
  );

  const [nume, setNume] = useState("");
  const [email, setEmail] = useState("");
  const [parola, setParola] = useState("");
  const [confirmareParola, setConfirmareParola] = useState("");

  const [mesaj, setMesaj] = useState("");
  const [tipMesaj, setTipMesaj] = useState("info");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const modeFromUrl = searchParams.get("mode");
    setMod(modeFromUrl === "register" ? "register" : "login");
  }, [searchParams]);

  function schimbareMod(nouMod) {
    setMod(nouMod);
    setMesaj("");
    setTipMesaj("info");

    if (nouMod === "register") {
      navigate("/autentificare?mode=register", { replace: true });
    } else {
      navigate("/autentificare", { replace: true });
    }
  }

  function resetFormular() {
    setNume("");
    setEmail("");
    setParola("");
    setConfirmareParola("");
  }

  function seteazaMesaj(text, tip = "info") {
    setMesaj(text);
    setTipMesaj(tip);
  }

  function parolaEsteValida(value) {
    return String(value || "").length >= 8;
  }

  async function handleInregistrare(e) {
    e.preventDefault();

    const numeCurat = nume.trim();
    const emailCurat = email.trim().toLowerCase();

    if (!numeCurat || !emailCurat || !parola || !confirmareParola) {
      seteazaMesaj("Completează toate câmpurile.", "error");
      return;
    }

    if (!emailCurat.includes("@")) {
      seteazaMesaj("Introdu o adresă de email validă.", "error");
      return;
    }

    if (!parolaEsteValida(parola)) {
      seteazaMesaj("Parola trebuie să aibă minimum 8 caractere.", "error");
      return;
    }

    if (parola !== confirmareParola) {
      seteazaMesaj("Parolele nu coincid.", "error");
      return;
    }

    try {
      setLoading(true);
      seteazaMesaj("Se creează contul...", "info");

      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: numeCurat,
          email: emailCurat,
          password: parola,
        }),
      });

      resetFormular();
      schimbareMod("login");

      seteazaMesaj(
        "Cont creat cu succes. Verifică linkul de activare din email sau din terminalul backend.",
        "success"
      );
    } catch (err) {
      console.error("REGISTER ERROR:", err);
      seteazaMesaj(traducereMesaj(err.message), "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAutentificare(e) {
    e.preventDefault();

    const emailCurat = email.trim().toLowerCase();

    if (!emailCurat || !parola) {
      seteazaMesaj("Completează emailul și parola.", "error");
      return;
    }

    try {
      setLoading(true);
      seteazaMesaj("Se realizează autentificarea...", "info");

      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: emailCurat,
          password: parola,
        }),
      });

      login(data.token, data.user);
      navigate("/panou");
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      seteazaMesaj(traducereMesaj(err.message), "error");
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
    if (msg === "Email not verified") {
      return "Contul nu este confirmat. Verifică emailul sau linkul afișat în terminalul backend.";
    }

    return msg;
  }

  return (
    <main style={styles.page}>
      <section style={styles.leftPanel}>
        <button
          type="button"
          style={styles.backButton}
          onClick={() => navigate("/")}
        >
          ← Înapoi la prezentare
        </button>

        <div style={styles.brandBlock}>
          <div style={styles.logoIcon}>ST</div>

          <div>
            <h1 style={styles.brandTitle}>SkillTrack</h1>
            <p style={styles.brandSubtitle}>Career Intelligence Platform</p>
          </div>
        </div>

        <div style={styles.heroTextBlock}>
          <div style={styles.eyebrow}>Platformă pentru carieră și competențe</div>

          <h2 style={styles.heroTitle}>
            Intră în cont și continuă dezvoltarea profilului tău profesional.
          </h2>

          <p style={styles.heroText}>
            Analizează joburi, identifică skilluri lipsă, generează roadmap-uri
            și urmărește progresul tău într-un singur loc.
          </p>
        </div>

        <div style={styles.featureList}>
          <FeatureItem text="Analiză joburi și scor de potrivire" />
          <FeatureItem text="Explicații clare pentru recomandări" />
          <FeatureItem text="Roadmaps personalizate" />
          <FeatureItem text="Profil profesional și raport final" />
        </div>
      </section>

      <section style={styles.authPanel}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardEyebrow}>
              {mod === "login" ? "Bine ai revenit" : "Creează cont"}
            </div>

            <h2 style={styles.cardTitle}>
              {mod === "login" ? "Autentificare" : "Înregistrare"}
            </h2>

            <p style={styles.cardSubtitle}>
              {mod === "login"
                ? "Introdu emailul și parola pentru a accesa aplicația."
                : "Completează datele de bază pentru a începe folosirea platformei."}
            </p>
          </div>

          <div style={styles.switch}>
            <button
              type="button"
              style={mod === "login" ? styles.activeTab : styles.tab}
              onClick={() => schimbareMod("login")}
              disabled={loading}
            >
              Autentificare
            </button>

            <button
              type="button"
              style={mod === "register" ? styles.activeTab : styles.tab}
              onClick={() => schimbareMod("register")}
              disabled={loading}
            >
              Înregistrare
            </button>
          </div>

          {mod === "register" ? (
            <form onSubmit={handleInregistrare} style={styles.form}>
              <label style={styles.inputGroup}>
                Nume complet
                <input
                  style={styles.input}
                  placeholder="Ex: Ana Ionescu"
                  value={nume}
                  onChange={(e) => setNume(e.target.value)}
                  disabled={loading}
                />
              </label>

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

              <label style={styles.inputGroup}>
                Parolă
                <input
                  style={styles.input}
                  type="password"
                  placeholder="Minimum 8 caractere"
                  value={parola}
                  onChange={(e) => setParola(e.target.value)}
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

              <div style={styles.securityNote}>
                Prin crearea contului, datele sunt folosite pentru analiza
                profilului, joburilor și progresului în aplicație.
              </div>

              <button type="submit" style={styles.button} disabled={loading}>
                {loading ? "Se creează..." : "Creează cont"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAutentificare} style={styles.form}>
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

              <label style={styles.inputGroup}>
                Parolă
                <input
                  style={styles.input}
                  type="password"
                  placeholder="Parola contului"
                  value={parola}
                  onChange={(e) => setParola(e.target.value)}
                  disabled={loading}
                />
              </label>

              <div style={styles.formMetaRow}>
                <span style={styles.smallMuted}>Sesiune securizată cu token JWT</span>

                <button
                  type="button"
                  style={styles.linkButton}
                  onClick={() => navigate("/ai-uitat-parola")}
                >
                  Ai uitat parola?
                </button>
              </div>

              <button type="submit" style={styles.button} disabled={loading}>
                {loading ? "Se autentifică..." : "Autentificare"}
              </button>
            </form>
          )}

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

          <div style={styles.bottomText}>
            {mod === "login" ? (
              <>
                Nu ai cont?{" "}
                <button
                  type="button"
                  style={styles.inlineButton}
                  onClick={() => schimbareMod("register")}
                >
                  Creează cont
                </button>
              </>
            ) : (
              <>
                Ai deja cont?{" "}
                <button
                  type="button"
                  style={styles.inlineButton}
                  onClick={() => schimbareMod("login")}
                >
                  Autentifică-te
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureItem({ text }) {
  return (
    <div style={styles.featureItem}>
      <span style={styles.checkIcon}>✓</span>
      <span>{text}</span>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "1.05fr 0.95fr",
    background:
      "radial-gradient(circle at top left, #eef2ff 0, transparent 34%), linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#111827",
  },

  leftPanel: {
    padding: "36px 54px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: "100vh",
    boxSizing: "border-box",
  },

  backButton: {
    alignSelf: "flex-start",
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    color: "#111827",
    borderRadius: 12,
    padding: "10px 13px",
    fontWeight: 800,
    cursor: "pointer",
  },

  brandBlock: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginTop: 36,
  },

  logoIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    background: "#111827",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 18,
    letterSpacing: "-0.05em",
    boxShadow: "0 14px 30px rgba(15,23,42,0.18)",
  },

  brandTitle: {
    margin: 0,
    fontSize: 26,
    color: "#111827",
    letterSpacing: "-0.04em",
  },

  brandSubtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: 13,
    fontWeight: 700,
  },

  heroTextBlock: {
    marginTop: 70,
    maxWidth: 660,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: 900,
    color: "#4f46e5",
    textTransform: "uppercase",
    letterSpacing: 1.3,
    marginBottom: 12,
  },

  heroTitle: {
    margin: 0,
    fontSize: 48,
    lineHeight: 1.02,
    letterSpacing: "-0.07em",
    color: "#0f172a",
  },

  heroText: {
    margin: "20px 0 0",
    color: "#475569",
    fontSize: 16,
    lineHeight: 1.75,
  },

  featureList: {
    display: "grid",
    gap: 10,
    marginTop: 48,
    maxWidth: 520,
  },

  featureItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#475569",
    fontWeight: 700,
    fontSize: 14,
  },

  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "#dcfce7",
    color: "#166534",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    flexShrink: 0,
  },

  authPanel: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    boxSizing: "border-box",
  },

  card: {
    width: "100%",
    maxWidth: 470,
    background: "#ffffff",
    padding: 28,
    borderRadius: 26,
    boxShadow: "0 30px 80px rgba(15, 23, 42, 0.14)",
    border: "1px solid #e5e7eb",
  },

  cardHeader: {
    marginBottom: 18,
  },

  cardEyebrow: {
    fontSize: 11,
    fontWeight: 900,
    color: "#4f46e5",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },

  cardTitle: {
    margin: 0,
    color: "#111827",
    fontSize: 30,
    letterSpacing: "-0.05em",
  },

  cardSubtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.6,
  },

  switch: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginBottom: 18,
    padding: 6,
    borderRadius: 16,
    background: "#f1f5f9",
  },

  tab: {
    padding: "10px 12px",
    border: "none",
    borderRadius: 12,
    background: "transparent",
    color: "#475569",
    cursor: "pointer",
    fontWeight: 900,
  },

  activeTab: {
    padding: "10px 12px",
    border: "none",
    borderRadius: 12,
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 900,
    boxShadow: "0 8px 22px rgba(15,23,42,0.14)",
  },

  form: {
    display: "grid",
    gap: 12,
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

  securityNote: {
    padding: 12,
    borderRadius: 14,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.55,
  },

  formMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },

  smallMuted: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: 700,
  },

  linkButton: {
    border: "none",
    background: "transparent",
    color: "#4f46e5",
    padding: 0,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 13,
  },

  button: {
    padding: "12px 14px",
    borderRadius: 13,
    border: "none",
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 14,
    boxShadow: "0 14px 28px rgba(15,23,42,0.16)",
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

  bottomText: {
    marginTop: 18,
    textAlign: "center",
    color: "#64748b",
    fontSize: 14,
    fontWeight: 700,
  },

  inlineButton: {
    border: "none",
    background: "transparent",
    color: "#4f46e5",
    padding: 0,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 14,
  },
};