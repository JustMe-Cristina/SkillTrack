import AppNavbar from "./AppNavbar";

export default function AppLayout({ title, subtitle, children }) {
  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <header style={styles.header}>
          <div style={styles.headerText}>
            {title ? <h1 style={styles.title}>{title}</h1> : null}
            {subtitle ? <p style={styles.subtitle}>{subtitle}</p> : null}
          </div>

          <AppNavbar />
        </header>

        <main style={styles.content}>{children}</main>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f6f9",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#111827"
  },

  shell: {
    width: "100%",
    maxWidth: 1200,
    margin: "0 auto",
    padding: "24px 24px 32px"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
    flexWrap: "wrap",
    marginBottom: 20
  },

  headerText: {
    minWidth: 0,
    flex: "1 1 320px"
  },

  title: {
    margin: 0,
    color: "#111827",
    fontSize: 30,
    lineHeight: 1.1,
    fontWeight: 900,
    letterSpacing: "-0.04em"
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#6b7280",
    fontSize: 14,
    lineHeight: 1.6,
    maxWidth: 760
  },

  content: {
    width: "100%"
  }
};