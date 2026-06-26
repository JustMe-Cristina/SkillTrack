import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RutaProtejata({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loading}>
        Se încarcă...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/autentificare" replace />;
  }

  return children;
}

const styles = {
  loading: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    fontWeight: 600,
    color: "#6b7280",
    background: "#f4f6f9"
  }
};