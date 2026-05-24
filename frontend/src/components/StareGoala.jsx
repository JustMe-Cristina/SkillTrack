export default function StareGoala({
  title = "Nu există date încă",
  message = "Adaugă informații pentru a vedea conținut aici.",
  actionLabel,
  onAction,
}) {
  return (
    <div style={styles.box}>
      <div style={styles.icon}>∅</div>

      <h3 style={styles.title}>{title}</h3>

      <p style={styles.message}>{message}</p>

      {actionLabel && onAction && (
        <button type="button" style={styles.button} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

const styles = {
  box: {
    minHeight: 150,
    borderRadius: 18,
    background: "#f8fafc",
    border: "1px dashed #cbd5e1",
    color: "#64748b",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 24,
  },

  icon: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    background: "#eef2ff",
    color: "#3730a3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    marginBottom: 12,
  },

  title: {
    margin: 0,
    color: "#111827",
    fontSize: 18,
  },

  message: {
    margin: "8px 0 0",
    maxWidth: 460,
    fontSize: 14,
    lineHeight: 1.6,
  },

  button: {
    marginTop: 16,
    padding: "10px 14px",
    borderRadius: 12,
    border: "none",
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 900,
  },
};