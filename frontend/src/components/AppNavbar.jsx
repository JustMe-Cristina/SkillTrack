import { Link, useLocation, useNavigate } from "react-router-dom";

export default function AppNavbar() {
  const location = useLocation();
  const navigate = useNavigate();

  function isActive(path) {
    return location.pathname === path;
  }

  function getLinkStyle(path) {
    const active = isActive(path);

    return {
      textDecoration: "none",
      padding: "10px 14px",
      borderRadius: 8,
      border: "1px solid #e5e7eb",
      background: active ? "#111827" : "white",
      color: active ? "white" : "#111827",
      fontWeight: 500,
      transition: "0.2s ease"
    };
  }

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/");
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.left}>
        <Link to="/dashboard" style={getLinkStyle("/dashboard")}>
          Dashboard
        </Link>

        <Link to="/analiza" style={getLinkStyle("/analiza")}>
          Analiză job
        </Link>

        <Link to="/competente" style={getLinkStyle("/competente")}>
          Competențele mele
        </Link>

        <Link to="/joburi" style={getLinkStyle("/joburi")}>
          Joburi urmărite
        </Link>

        <Link to="/roadmaps" style={getLinkStyle("/roadmaps")}>
          Planuri de dezvoltare
        </Link>
      </div>

      <button onClick={handleLogout} style={styles.logoutButton}>
        Logout
      </button>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap"
  },
  left: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap"
  },
  logoutButton: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "none",
    background: "#dc2626",
    color: "white",
    fontWeight: 600,
    cursor: "pointer"
  }
};