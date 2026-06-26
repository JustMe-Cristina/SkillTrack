export default function MesajFeedback({
  message,
  type = "info"
}) {
  if (!message) return null;

  return (
    <div
      role="alert"
      style={styles[type] ?? styles.info}
    >
      {message}
    </div>
  );
}

const base = {
  padding: "14px 16px",
  marginBottom: 18,
  borderRadius: 14,
  border: "1px solid transparent",
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.5
};

const styles = {
  success: {
    ...base,
    background: "#ecfdf5",
    color: "#166534",
    borderColor: "#bbf7d0"
  },

  error: {
    ...base,
    background: "#fef2f2",
    color: "#991b1b",
    borderColor: "#fecaca"
  },

  info: {
    ...base,
    background: "#eef2ff",
    color: "#3730a3",
    borderColor: "#c7d2fe"
  }
};