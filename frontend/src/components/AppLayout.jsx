import AppNavbar from "./AppNavbar";

export default function AppLayout({ title, subtitle, children }) {
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{title}</h1>
          {subtitle ? <p style={styles.subtitle}>{subtitle}</p> : null}
        </div>

        <AppNavbar />
      </div>

      <div style={styles.content}>{children}</div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f6f9",
    padding: 24,
    fontFamily: "Inter, sans-serif"
  },
  header: {
    maxWidth: 1200,
    margin: "0 auto 20px auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
    flexWrap: "wrap"
  },
  title: {
    margin: 0,
    color: "#111827"
  },
  subtitle: {
    marginTop: 8,
    color: "#6b7280"
  },
  content: {
    maxWidth: 1200,
    margin: "0 auto"
  }
};