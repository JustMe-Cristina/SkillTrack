import { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";

export default function ProfilulMeu() {
  const [user, setUser] = useState({
    name: "",
    email: "",
    role: "",
    theme: "light"
  });

  useEffect(() => {
    // simulare date user (temporar)
    const storedUser = JSON.parse(localStorage.getItem("user"));

    if (storedUser) {
      setUser((prev) => ({
        ...prev,
        name: storedUser.name || "",
        email: storedUser.email || ""
      }));
    }
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;

    setUser((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  function handleSave() {
    localStorage.setItem("user", JSON.stringify(user));
    alert("Profil actualizat!");
  }

  return (
    <AppLayout
      title="Profilul meu"
      subtitle="Gestionează informațiile tale și preferințele aplicației"
    >
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Informații generale</h3>

        <input
          style={styles.input}
          placeholder="Nume"
          name="name"
          value={user.name}
          onChange={handleChange}
        />

        <input
          style={styles.input}
          placeholder="Email"
          name="email"
          value={user.email}
          onChange={handleChange}
        />

        <input
          style={styles.input}
          placeholder="Rol / specializare (ex: Data Analyst)"
          name="role"
          value={user.role}
          onChange={handleChange}
        />

        <h3 style={styles.sectionTitle}>Preferințe</h3>

        <select
          style={styles.input}
          name="theme"
          value={user.theme}
          onChange={handleChange}
        >
          <option value="light">Day mode</option>
          <option value="dark">Night mode</option>
        </select>

        <button style={styles.button} onClick={handleSave}>
          Salvează profilul
        </button>
      </div>
    </AppLayout>
  );
}

const styles = {
  card: {
    background: "white",
    padding: 24,
    borderRadius: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
    maxWidth: 500
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 10,
    color: "#111827"
  },
  input: {
    width: "100%",
    padding: 12,
    borderRadius: 8,
    border: "1px solid #d1d5db",
    marginBottom: 12,
    fontSize: 14
  },
  button: {
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    border: "none",
    background: "#111827",
    color: "white",
    cursor: "pointer",
    fontWeight: 600
  }
};