import { useNavigate } from "react-router-dom";

function hasAuthToken() {
  return Boolean(localStorage.getItem("token"));
}

export default function LandingPage() {
  const navigate = useNavigate();
  const isLoggedIn = hasAuthToken();

  return (
    <main style={styles.page}>
      <nav style={styles.navbar}>
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>ST</div>

          <div>
            <div style={styles.logoText}>SkillTrack</div>
            <div style={styles.logoSubtext}>
              Career Intelligence Platform
            </div>
          </div>
        </div>

        <div style={styles.navActions}>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => navigate("/autentificare")}
          >
            Autentificare
          </button>

          <button
            type="button"
            style={styles.primaryButton}
            onClick={() => navigate("/autentificare?mode=register")}
          >
            Creează cont
          </button>
        </div>
      </nav>

      <section style={styles.heroSection}>
        <div style={styles.heroContent}>
          <div style={styles.heroBadge}>
            Platformă pentru carieră, competențe și joburi
          </div>

          <h1 style={styles.heroTitle}>
            Transformă joburile urmărite în planuri clare de dezvoltare.
          </h1>

          <p style={styles.heroText}>
            SkillTrack analizează descrieri de joburi, compară cerințele cu
            profilul tău, identifică skillurile lipsă și generează roadmap-uri
            personalizate pentru evoluția ta profesională.
          </p>

          <div style={styles.heroActions}>
            <button
              type="button"
              style={styles.heroPrimaryButton}
              onClick={() => navigate("/autentificare")}
            >
              Deschide aplicația
            </button>

            <button
              type="button"
              style={styles.heroSecondaryButton}
              onClick={() => {
                const section = document.getElementById(
                  "cum-functioneaza"
                );

                section?.scrollIntoView({
                  behavior: "smooth",
                });
              }}
            >
              Vezi cum funcționează
            </button>
          </div>

          <div style={styles.trustRow}>
            <span>Analiză joburi</span>
            <span>ML</span>
            <span>XAI</span>
            <span>CV parsing</span>
            <span>Roadmaps</span>
          </div>
        </div>

        <div style={styles.heroPreviewCard}>
          <div style={styles.previewTopBar}>
            <span style={styles.previewDotRed} />
            <span style={styles.previewDotYellow} />
            <span style={styles.previewDotGreen} />
          </div>

          <div style={styles.previewCardHeader}>
            <div>
              <div style={styles.previewEyebrow}>Job match</div>

              <h2 style={styles.previewTitle}>
                Data Analyst Intern
              </h2>

              <p style={styles.previewMeta}>
                Cluj-Napoca · Hybrid · Internship
              </p>
            </div>

            <div style={styles.scoreCircle}>78%</div>
          </div>

          <div style={styles.previewGrid}>
            <PreviewMetric
              label="Skilluri acoperite"
              value="9"
            />

            <PreviewMetric
              label="Gapuri detectate"
              value="4"
            />

            <PreviewMetric
              label="Categorie ML"
              value="DATA"
            />
          </div>

          <div style={styles.previewInsight}>
            <strong>Recomandare:</strong> dezvoltă Power BI,
            Data Visualization și ETL pentru a crește
            potrivirea cu joburile salvate.
          </div>

          <div style={styles.previewProgress}>
            <div style={styles.previewProgressTop}>
              <span>Roadmap progress</span>
              <strong>62%</strong>
            </div>

            <div style={styles.progressTrack}>
              <div style={styles.progressFill} />
            </div>
          </div>
        </div>
      </section>

      <section style={styles.statsStrip}>
        <StatItem value="6+" label="module integrate" />
        <StatItem value="ML" label="clasificare joburi" />
        <StatItem value="XAI" label="explicații locale" />
        <StatItem value="PDF" label="raport profil" />
      </section>

      <section
        id="cum-functioneaza"
        style={styles.section}
      >
        <div style={styles.sectionHeader}>
          <div style={styles.sectionEyebrow}>
            Cum funcționează
          </div>

          <h2 style={styles.sectionTitle}>
            Un flux complet pentru dezvoltare profesională
          </h2>

          <p style={styles.sectionText}>
            SkillTrack conectează analiza joburilor,
            profilul de competențe, roadmap-urile și
            analytics-ul într-o singură experiență.
          </p>
        </div>

        <div style={styles.stepsGrid}>
          <StepCard
            number="01"
            title="Analizezi un job"
            text="Introduci descrierea jobului, iar aplicația detectează skillurile și calculează scorul de potrivire."
          />

          <StepCard
            number="02"
            title="Compari cu profilul tău"
            text="Vezi ce competențe ai deja și ce trebuie dezvoltat pentru rolurile dorite."
          />

          <StepCard
            number="03"
            title="Generezi roadmap-uri"
            text="Transformi gapurile de skilluri în pași concreți de învățare."
          />

          <StepCard
            number="04"
            title="Monitorizezi progresul"
            text="Urmărești analytics, progresul roadmap-urilor și evoluția profesională."
          />
        </div>
      </section>

      <section style={styles.featuresSection}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionEyebrow}>
            Funcționalități
          </div>

          <h2 style={styles.sectionTitle}>
            Ce oferă SkillTrack
          </h2>
        </div>

        <div style={styles.featuresGrid}>
          <FeatureCard
            icon="🎯"
            title="Scor de potrivire"
            text="Calculează rapid cât de bine se potrivește profilul tău cu cerințele jobului."
          />

          <FeatureCard
            icon="🧠"
            title="Clasificare ML"
            text="Joburile sunt clasificate automat în categorii relevante."
          />

          <FeatureCard
            icon="🔎"
            title="Explicații XAI"
            text="Vezi ce skilluri influențează scorul și recomandările."
          />

          <FeatureCard
            icon="📄"
            title="Analiză CV"
            text="Detectează competențe din CV și le adaugă în profil."
          />

          <FeatureCard
            icon="🧭"
            title="Roadmaps"
            text="Primești pași concreți pentru dezvoltarea skillurilor lipsă."
          />

          <FeatureCard
            icon="📊"
            title="Analytics"
            text="Dashboard modern cu progres, activitate și insight-uri."
          />
        </div>
      </section>

      <section style={styles.ctaSection}>
        <h2 style={styles.ctaTitle}>
          Începe să îți construiești profilul profesional.
        </h2>

        <p style={styles.ctaText}>
          Creează un cont, analizează primul job și
          transformă cerințele pieței într-un plan concret
          de dezvoltare.
        </p>

        <div style={styles.ctaActions}>
          <button
            type="button"
            style={styles.heroPrimaryButton}
            onClick={() => navigate("/autentificare")}
          >
            Deschide aplicația
          </button>

          <button
            type="button"
            style={styles.heroSecondaryButton}
            onClick={() => navigate("/autentificare")}
          >
            Am deja cont
          </button>
        </div>
      </section>

      <footer style={styles.footer}>
        <span>SkillTrack</span>

        <span>
          Platformă academică pentru analiză joburi,
          competențe și dezvoltare profesională.
        </span>
      </footer>
    </main>
  );
}

function PreviewMetric({ label, value }) {
  return (
    <div style={styles.previewMetric}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatItem({ value, label }) {
  return (
    <div style={styles.statItem}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function StepCard({ number, title, text }) {
  return (
    <article style={styles.stepCard}>
      <div style={styles.stepNumber}>{number}</div>

      <h3 style={styles.stepTitle}>{title}</h3>

      <p style={styles.stepText}>{text}</p>
    </article>
  );
}

function FeatureCard({ icon, title, text }) {
  return (
    <article style={styles.featureCard}>
      <div style={styles.featureIcon}>{icon}</div>

      <h3 style={styles.featureTitle}>{title}</h3>

      <p style={styles.featureText}>{text}</p>
    </article>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, #eef2ff 0, transparent 34%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    color: "#111827",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, sans-serif",
  },

  navbar: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "22px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  logoWrap: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    background: "#111827",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
  },

  logoText: {
    fontSize: 18,
    fontWeight: 900,
  },

  logoSubtext: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 700,
  },

  navActions: {
    display: "flex",
    gap: 10,
  },

  primaryButton: {
    padding: "11px 15px",
    borderRadius: 12,
    border: "none",
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 900,
  },

  secondaryButton: {
    padding: "11px 15px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 900,
  },

  heroSection: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "60px 24px",
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: 36,
    alignItems: "center",
  },

  heroBadge: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#4338ca",
    fontSize: 12,
    fontWeight: 900,
    marginBottom: 18,
  },

  heroTitle: {
    margin: 0,
    fontSize: 60,
    lineHeight: 1,
    letterSpacing: "-0.07em",
    maxWidth: 700,
  },

  heroText: {
    marginTop: 22,
    maxWidth: 650,
    color: "#475569",
    fontSize: 17,
    lineHeight: 1.8,
  },

  heroActions: {
    display: "flex",
    gap: 12,
    marginTop: 28,
    flexWrap: "wrap",
  },

  heroPrimaryButton: {
    padding: "14px 18px",
    borderRadius: 14,
    border: "none",
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 900,
    boxShadow: "0 14px 30px rgba(15,23,42,0.18)",
  },

  heroSecondaryButton: {
    padding: "14px 18px",
    borderRadius: 14,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 900,
  },

  trustRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 24,
    color: "#475569",
    fontSize: 13,
    fontWeight: 700,
  },

  heroPreviewCard: {
    borderRadius: 28,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    padding: 22,
    boxShadow: "0 30px 90px rgba(15,23,42,0.14)",
  },

  previewTopBar: {
    display: "flex",
    gap: 6,
    marginBottom: 18,
  },

  previewDotRed: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#ef4444",
  },

  previewDotYellow: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#f59e0b",
  },

  previewDotGreen: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#22c55e",
  },

  previewCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    marginBottom: 18,
  },

  previewEyebrow: {
    fontSize: 11,
    fontWeight: 900,
    color: "#4f46e5",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },

  previewTitle: {
    margin: "6px 0 0",
    fontSize: 24,
  },

  previewMeta: {
    marginTop: 8,
    color: "#64748b",
    fontSize: 13,
  },

  scoreCircle: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    background: "#dcfce7",
    color: "#166534",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 22,
  },

  previewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: 10,
    marginBottom: 14,
  },

  previewMetric: {
    padding: 12,
    borderRadius: 14,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    display: "grid",
    gap: 5,
  },

  previewInsight: {
    padding: 14,
    borderRadius: 16,
    background: "#eef2ff",
    color: "#3730a3",
    fontSize: 13,
    lineHeight: 1.6,
    marginBottom: 16,
  },

  previewProgress: {
    display: "grid",
    gap: 8,
  },

  previewProgressTop: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
    fontWeight: 800,
    color: "#475569",
  },

  progressTrack: {
    height: 10,
    borderRadius: 999,
    background: "#e5e7eb",
    overflow: "hidden",
  },

  progressFill: {
    width: "62%",
    height: "100%",
    background:
      "linear-gradient(90deg, #378ADD, #1D9E75)",
  },

  statsStrip: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "0 24px 24px",
    display: "grid",
    gridTemplateColumns: "repeat(4,1fr)",
    gap: 14,
  },

  statItem: {
    background: "#ffffff",
    borderRadius: 18,
    padding: 18,
    border: "1px solid #e5e7eb",
    display: "grid",
    gap: 6,
  },

  section: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "60px 24px 24px",
  },

  sectionHeader: {
    maxWidth: 760,
    marginBottom: 28,
  },

  sectionEyebrow: {
    fontSize: 11,
    fontWeight: 900,
    color: "#4f46e5",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 8,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 36,
    letterSpacing: "-0.05em",
  },

  sectionText: {
    color: "#64748b",
    lineHeight: 1.7,
  },

  stepsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4,1fr)",
    gap: 14,
  },

  stepCard: {
    background: "#ffffff",
    borderRadius: 20,
    padding: 20,
    border: "1px solid #e5e7eb",
  },

  stepNumber: {
    color: "#4f46e5",
    fontWeight: 900,
    marginBottom: 12,
  },

  stepTitle: {
    margin: 0,
    fontSize: 18,
  },

  stepText: {
    color: "#64748b",
    lineHeight: 1.7,
  },

  featuresSection: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "50px 24px 24px",
  },

  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: 14,
  },

  featureCard: {
    background: "#ffffff",
    borderRadius: 20,
    padding: 20,
    border: "1px solid #e5e7eb",
  },

  featureIcon: {
    fontSize: 28,
    marginBottom: 14,
  },

  featureTitle: {
    margin: 0,
    fontSize: 18,
  },

  featureText: {
    color: "#64748b",
    lineHeight: 1.7,
  },

  ctaSection: {
    maxWidth: 1180,
    margin: "50px auto 0",
    padding: "48px 24px",
    borderRadius: 32,
    background: "#111827",
    color: "#ffffff",
    textAlign: "center",
  },

  ctaTitle: {
    margin: 0,
    fontSize: 36,
  },

  ctaText: {
    margin: "14px auto 0",
    maxWidth: 680,
    color: "#cbd5e1",
    lineHeight: 1.7,
  },

  ctaActions: {
    marginTop: 24,
    display: "flex",
    justifyContent: "center",
    gap: 12,
    flexWrap: "wrap",
  },

  footer: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "28px 24px",
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: 13,
  },
};