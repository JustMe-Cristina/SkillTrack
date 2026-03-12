import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function CompetenteleMele() {

  const [mySkills, setMySkills] = useState([]);
  const [catalogSkills, setCatalogSkills] = useState([]);

  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [selectedLevel, setSelectedLevel] = useState(1);

  const [cvFile, setCvFile] = useState(null);
  const [detectedSkills, setDetectedSkills] = useState([]);

  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchMySkills();
    fetchCatalogSkills();
  }, []);

  async function fetchMySkills() {

    const token = localStorage.getItem("token");

    try {

      const res = await fetch(
        "http://localhost:5050/api/user-skills",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await res.json();

      if (data.ok) {
        setMySkills(data.skills);
      }

    } catch (err) {
      console.error(err);
      setMessage("Eroare la încărcarea competențelor.");
    }
  }

  async function fetchCatalogSkills() {

    const token = localStorage.getItem("token");

    try {

      const res = await fetch(
        "http://localhost:5050/api/skills",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await res.json();

      if (data.ok) {
        setCatalogSkills(data.skills);
      }

    } catch (err) {
      console.error(err);
      setMessage("Eroare la încărcarea catalogului.");
    }
  }

  async function handleAddSkill(e) {

    e.preventDefault();

    if (!selectedSkillId) {
      setMessage("Selectează o competență.");
      return;
    }

    const token = localStorage.getItem("token");

    try {

      const res = await fetch(
        "http://localhost:5050/api/user-skills",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            skillId: Number(selectedSkillId),
            level: Number(selectedLevel),
            confidence: 3
          })
        }
      );

      const data = await res.json();

      if (data.ok) {

        setMessage("Competența a fost adăugată.");

        setSelectedSkillId("");
        setSelectedLevel(1);

        fetchMySkills();
      }

    } catch (err) {
      console.error(err);
      setMessage("Eroare la adăugarea competenței.");
    }
  }

  async function handleUploadCV() {

    if (!cvFile) {
      setMessage("Selectează un CV.");
      return;
    }

    const token = localStorage.getItem("token");

    const formData = new FormData();
    formData.append("cv", cvFile);

    try {

      const res = await fetch(
        "http://localhost:5050/api/cv/extract",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        }
      );

      const data = await res.json();

      if (data.ok) {

        setDetectedSkills(data.detectedSkills);

      } else {

        setMessage(data.error);
      }

    } catch (err) {

      console.error(err);
      setMessage("Eroare la analizarea CV-ului.");
    }
  }

  async function addSkillFromCV(skillId) {

    const token = localStorage.getItem("token");

    try {

      const res = await fetch(
        "http://localhost:5050/api/user-skills",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            skillId,
            level: 2,
            confidence: 2
          })
        }
      );

      const data = await res.json();

      if (data.ok) {
        fetchMySkills();
      }

    } catch (err) {
      console.error(err);
    }
  }

  async function updateSkillLevel(skillId, level) {

    const token = localStorage.getItem("token");

    try {

      await fetch(
        `http://localhost:5050/api/user-skills/${skillId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            level
          })
        }
      );

      fetchMySkills();

    } catch (err) {
      console.error(err);
    }
  }

  async function deleteSkill(skillId) {

    const confirmDelete = window.confirm(
      "Sigur vrei să ștergi această competență?"
    );

    if (!confirmDelete) return;

    const token = localStorage.getItem("token");

    try {

      await fetch(
        `http://localhost:5050/api/user-skills/${skillId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      fetchMySkills();

    } catch (err) {
      console.error(err);
    }
  }

  return (

    <div style={styles.page}>

      <div style={styles.header}>

        <h1 style={styles.title}>Competențele mele</h1>

        <div style={styles.nav}>
          <Link to="/analiza" style={styles.link}>Analiză job</Link>
          <Link to="/joburi" style={styles.link}>Joburi urmărite</Link>
          <Link to="/roadmaps">Planuri de dezvoltare</Link>
        </div>

      </div>

      <div style={styles.card}>

        <h2>Adaugă competență</h2>

        <form onSubmit={handleAddSkill} style={styles.form}>

          <select
            style={styles.input}
            value={selectedSkillId}
            onChange={(e) => setSelectedSkillId(e.target.value)}
          >
            <option value="">Selectează competența</option>

            {catalogSkills.map((skill) => (
              <option key={skill.id} value={skill.id}>
                {skill.name} ({skill.category})
              </option>
            ))}

          </select>

          <select
            style={styles.input}
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
          >
            <option value={1}>Nivel 1</option>
            <option value={2}>Nivel 2</option>
            <option value={3}>Nivel 3</option>
            <option value={4}>Nivel 4</option>
            <option value={5}>Nivel 5</option>
          </select>

          <button type="submit" style={styles.button}>
            Adaugă competență
          </button>

        </form>

        <h2>Importă competențe din CV</h2>

        <input
          type="file"
          accept=".pdf,.docx"
          onChange={(e) => setCvFile(e.target.files[0])}
        />

        <button
          onClick={handleUploadCV}
          style={styles.button}
        >
          Analizează CV
        </button>

        {detectedSkills.length > 0 && (

          <div style={styles.result}>

            <h3>Competențe detectate</h3>

            {detectedSkills.map((skill) => (

              <div
                key={skill.skillId}
                style={styles.cvSkill}
              >

                <span>{skill.name}</span>

                {skill.isNew ? (

                  <button
                    style={styles.secondaryButton}
                    onClick={() => addSkillFromCV(skill.skillId)}
                  >
                    Adaugă
                  </button>

                ) : (

                  <span>Deja adăugat</span>

                )}

              </div>

            ))}

          </div>

        )}

        <h2>Lista competențelor</h2>

        <table style={styles.table}>

          <thead>

            <tr>
              <th>Competență</th>
              <th>Nivel</th>
              <th>Acțiuni</th>
            </tr>

          </thead>

          <tbody>

            {mySkills.map((skill) => (

              <tr key={skill.skill_id}>

                <td>{skill.name}</td>

                <td>

                  <select
                    value={skill.level}
                    onChange={(e) =>
                      updateSkillLevel(skill.skill_id, e.target.value)
                    }
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                  </select>

                </td>

                <td>

                  <button
                    style={styles.dangerButton}
                    onClick={() => deleteSkill(skill.skill_id)}
                  >
                    Șterge
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

        {message && (
          <div style={styles.message}>
            {message}
          </div>
        )}

      </div>

    </div>
  );
}

const styles = {

  page: {
    minHeight: "100vh",
    background: "#f4f6f9",
    padding: 24,
    fontFamily: "Inter"
  },

  header: {
    maxWidth: 900,
    margin: "0 auto 20px auto",
    display: "flex",
    justifyContent: "space-between"
  },

  title: {
    margin: 0
  },

  nav: {
    display: "flex",
    gap: 12
  },

  link: {
    textDecoration: "none",
    padding: "10px 14px",
    background: "white",
    borderRadius: 8
  },

  card: {
    maxWidth: 900,
    margin: "0 auto",
    background: "white",
    padding: 24,
    borderRadius: 12
  },

  form: {
    display: "flex",
    gap: 10,
    marginBottom: 20
  },

  input: {
    padding: 10
  },

  button: {
    padding: "10px 14px",
    background: "#111827",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer"
  },

  secondaryButton: {
    padding: "6px 10px",
    background: "#e5e7eb",
    border: "none",
    borderRadius: 6
  },

  dangerButton: {
    padding: "6px 10px",
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: 6
  },

  result: {
    marginTop: 20
  },

  cvSkill: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 8
  },

  table: {
    width: "100%",
    marginTop: 20,
    borderCollapse: "collapse"
  },

  message: {
    marginTop: 20
  }

};