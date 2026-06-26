export default function StareGoala({
  title = "Nu există date încă",
  message = "Adaugă informații pentru a vedea conținut aici.",
  actionLabel,
  onAction
}) {
  return (
    <div style={styles.box}>
      <div style={styles.icon}>∅</div>

      <h3 style={styles.title}>{title}</h3>

      <p style={styles.message}>{message}</p>

      {actionLabel && onAction && (
        <button
          type="button"
          style={styles.button}
          onClick={onAction}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

const styles = {
  box: {
    minHeight: 220,
    background: "#ffffff",
    border: "1px dashed #d1d5db",
    borderRadius: 18,
    padding: 32,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    boxShadow: "0 10px 24px rgba(15,23,42,0.04)"
  },

  icon: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "#eef2ff",
    color: "#3730a3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    fontWeight: 900,
    marginBottom: 18
  },

  title: {
    margin: 0,
    color: "#111827",
    fontSize: 20,
    fontWeight: 800
  },

  message: {
    margin: "10px 0 0",
    maxWidth: 500,
    color: "#6b7280",
    fontSize: 15,
    lineHeight: 1.7
  },

  button: {
    marginTop: 22,
    padding: "12px 18px",
    border: "none",
    borderRadius: 12,
    background: "#111827",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    transition: "0.2s"
  }
};