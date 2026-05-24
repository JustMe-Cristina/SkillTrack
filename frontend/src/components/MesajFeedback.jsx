export default function MesajFeedback({ message, type = "info" }) {
  if (!message) return null;

  return (
    <div style={styles[type] || styles.info}>
      {message}
    </div>
  );
}

const base = {
  padding: "13px 15px",
  borderRadius: 14,
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.5,
  marginBottom: 16,
};

const styles = {
  success: {
    ...base,
    background: "#ecfdf5",
    color: "#166534",
    border: "1px solid #bbf7d0",
  },
  error: {
    ...base,
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca",
  },
  info: {
    ...base,
    background: "#eef2ff",
    color: "#3730a3",
    border: "1px solid #c7d2fe",
  },
};