import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_LINKS = [
  { path: "/panou", label: "Dashboard" },
  { path: "/analiza", label: "Analiză job" },
  { path: "/competentele-mele", label: "Competențele mele" },
  { path: "/joburi-urmarite", label: "Joburi urmărite" },
  { path: "/roadmaps", label: "Planuri de dezvoltare" },
  { path: "/analytics", label: "Analytics" },
  { path: "/profilul-meu", label: "Profilul meu" }
];

export default function AppNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const isActive = (path) =>
    location.pathname === path ||
    location.pathname.startsWith(`${path}/`);

  const getLinkStyle = (path) => ({
    ...styles.link,
    ...(isActive(path) ? styles.linkActive : styles.linkInactive)
  });

  const handleLogout = () => {
    logout();
    navigate("/autentificare");
  };

  return (
    <nav style={styles.wrapper} aria-label="Navigare principală">
      <div style={styles.links}>
        {NAV_LINKS.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={getLinkStyle(item.path)}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div style={styles.actions}>
        {user && (
          <div style={styles.userBadge}>
            {user.name}
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          style={styles.logoutButton}
        >
          Deconectare
        </button>
      </div>
    </nav>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 20,
    width: "100%"
  },

  links: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    flex: "1 1 700px"
  },

  actions: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap"
  },

  link: {
    textDecoration: "none",
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    fontSize: 13,
    fontWeight: 700,
    transition: "all 0.2s ease",
    whiteSpace: "nowrap"
  },

  linkActive: {
    background: "#111827",
    color: "#ffffff",
    borderColor: "#111827",
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.12)"
  },

  linkInactive: {
    background: "#ffffff",
    color: "#111827"
  },

  userBadge: {
    padding: "10px 14px",
    borderRadius: 12,
    background: "#eef2ff",
    border: "1px solid #c7d2fe",
    color: "#3730a3",
    fontSize: 13,
    fontWeight: 700,
    whiteSpace: "nowrap"
  },

  logoutButton: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #fecaca",
    background: "#fff1f2",
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap"
  }
};