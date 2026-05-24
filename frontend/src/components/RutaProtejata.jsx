import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function RutaProtejata({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <p>Se încarcă...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/autentificare" replace />;
  }

  return children;
}

export default RutaProtejata;