import { API_URL } from "../services/api";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";

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

  const availableSkills = useMemo(() => {
    return catalogSkills.filter(
      (catalogSkill) =>
        !mySkills.some((mySkill) => Number(mySkill.skill_id) === Number(catalogSkill.id))
    );
  }, [catalogSkills, mySkills]);

  async function fetchMySkills() {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API_URL}/api/user-skills`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (data.ok) {
        setMySkills(data.skills || []);
      } else {
        setMessage(data.error || "Nu s-au putut încărca competențele.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Eroare la încărcarea competențelor.");
    }
  }

  async function fetchCatalogSkills() {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API_URL}/api/skills`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (data.ok) {
        setCatalogSkills(data.skills || []);
      } else {
        setMessage(data.error || "Nu s-a putut încărca catalogul.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Eroare la încărcarea catalogului.");
    }
  }

  async function handleAddSkill(e) {
    e.preventDefault();
    setMessage("");

    if (!selectedSkillId) {
      setMessage("Selectează o competență.");
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API_URL}/api/user-skills`, {
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
      });

      const data = await res.json();

      if (data.ok) {
        setMessage("Competența a fost adăugată.");
        setSelectedSkillId("");
        setSelectedLevel(1);

        await fetchMySkills();

        setDetectedSkills((prev) =>
          prev.map((skill) =>
            Number(skill.skillId) === Number(selectedSkillId)
              ? { ...skill, isNew: false }
              : skill
          )
        );
      } else {
        setMessage(data.error || "Nu s-a putut adăuga competența.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Eroare la adăugarea competenței.");
    }
  }

  async function handleUploadCV() {
    setMessage("");

    if (!cvFile) {
      setMessage("Selectează un CV.");
      return;
    }

    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("cv", cvFile);

    try {
      const res = await fetch(`${API_URL}/api/cv/extract`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();

      if (data.ok) {
        setDetectedSkills(data.detectedSkills || []);
        setMessage("CV-ul a fost analizat cu succes.");
      } else {
        setMessage(data.error || "Nu s-a putut analiza CV-ul.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Eroare la analizarea CV-ului.");
    }
  }

  async function addSkillFromCV(skillId) {
    setMessage("");

    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API_URL}/api/user-skills`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          skillId: Number(skillId),
          level: 2,
          confidence: 2
        })
      });

      const data = await res.json();

      if (data.ok) {
        await fetchMySkills();

        setDetectedSkills((prev) =>
          prev.map((skill) =>
            Number(skill.skillId) === Number(skillId)
              ? { ...skill, isNew: false }
              : skill
          )
        );

        setMessage("Competența a fost adăugată din CV.");
      } else {
        setMessage(data.error || "Nu s-a putut adăuga competența din CV.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Eroare la adăugarea competenței din CV.");
    }
  }

  async function updateSkillLevel(skillId, level) {
    setMessage("");

    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API_URL}/api/user-skills/${skillId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          level: Number(level)
        })
      });

      const data = await res.json();

      if (data.ok) {
        await fetchMySkills();
        setMessage("Nivelul competenței a fost actualizat.");
      } else {
        setMessage(data.error || "Nu s-a putut actualiza nivelul.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Eroare la actualizarea nivelului.");
    }
  }

  async function deleteSkill(skillId) {
    const confirmDelete = window.confirm(
      "Sigur vrei să ștergi această competență?"
    );

    if (!confirmDelete) return;

    setMessage("");

    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API_URL}/api/user-skills/${skillId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (data.ok) {
        await fetchMySkills();

        setDetectedSkills((prev) =>
          prev.map((skill) =>
            Number(skill.skillId) === Number(skillId)
              ? { ...skill, isNew: true }
              : skill
          )
        );

        setMessage("Competența a fost ștearsă.");
      } else {
        setMessage(data.error || "Nu s-a putut șterge competența.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Eroare la ștergerea competenței.");
    }
  }

  return (
    <AppLayout
      title="Competențele mele"
      subtitle="Administrează și actualizează profilul tău de competențe"
    >
      {message && <div style={styles.message}>{message}</div>}

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Adaugă competență</h2>

        <form onSubmit={handleAddSkill} style={styles.form}>
          <select
            style={styles.input}
            value={selectedSkillId}
            onChange={(e) => setSelectedSkillId(e.target.value)}
          >
            <option value="">Selectează competența</option>

            {availableSkills.map((skill) => (
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

        <div style={styles.separator} />

        <h2 style={styles.sectionTitle}>Importă competențe din CV</h2>

        <div style={styles.cvActions}>
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={(e) => setCvFile(e.target.files[0])}
          />

          <button onClick={handleUploadCV} style={styles.button} type="button">
            Analizează CV
          </button>
        </div>

        {detectedSkills.length > 0 && (
          <div style={styles.result}>
            <h3 style={styles.subTitle}>Competențe detectate</h3>

            {detectedSkills.map((skill) => (
              <div key={skill.skillId} style={styles.cvSkill}>
                <span>{skill.name}</span>

                {skill.isNew ? (
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => addSkillFromCV(skill.skillId)}
                  >
                    Adaugă
                  </button>
                ) : (
                  <span style={styles.alreadyAdded}>Deja adăugat</span>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={styles.separator} />

        <h2 style={styles.sectionTitle}>Lista competențelor</h2>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Competență</th>
              <th style={styles.th}>Nivel</th>
              <th style={styles.th}>Acțiuni</th>
            </tr>
          </thead>

          <tbody>
            {mySkills.length === 0 ? (
              <tr>
                <td colSpan="3" style={styles.emptyCell}>
                  Nu ai adăugat încă nicio competență.
                </td>
              </tr>
            ) : (
              mySkills.map((skill) => (
                <tr key={skill.skill_id}>
                  <td style={styles.td}>{skill.name}</td>

                  <td style={styles.td}>
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

                  <td style={styles.td}>
                    <button
                      type="button"
                      style={styles.dangerButton}
                      onClick={() => deleteSkill(skill.skill_id)}
                    >
                      Șterge
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}

const styles = {
  message: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    background: "#ffffff",
    color: "#374151",
    boxShadow: "0 10px 30px rgba(0,0,0,0.04)"
  },
  card: {
    background: "white",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)"
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: 16,
    color: "#111827"
  },
  subTitle: {
    marginBottom: 12,
    color: "#111827"
  },
  separator: {
    height: 1,
    background: "#e5e7eb",
    margin: "24px 0"
  },
  form: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap"
  },
  input: {
    padding: 10,
    minWidth: 220,
    borderRadius: 8,
    border: "1px solid #d1d5db"
  },
  cvActions: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap"
  },
  button: {
    padding: "10px 14px",
    background: "#111827",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600
  },
  secondaryButton: {
    padding: "6px 10px",
    background: "#e5e7eb",
    border: "none",
    borderRadius: 6,
    cursor: "pointer"
  },
  dangerButton: {
    padding: "6px 10px",
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer"
  },
  result: {
    marginTop: 20
  },
  cvSkill: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
    padding: "10px 12px",
    background: "#f9fafb",
    borderRadius: 8
  },
  alreadyAdded: {
    color: "#16a34a",
    fontWeight: 500
  },
  table: {
    width: "100%",
    marginTop: 12,
    borderCollapse: "collapse"
  },
  th: {
    textAlign: "left",
    padding: "12px 10px",
    borderBottom: "1px solid #e5e7eb"
  },
  td: {
    padding: "12px 10px",
    borderBottom: "1px solid #f1f5f9"
  },
  emptyCell: {
    padding: 20,
    textAlign: "center",
    color: "#6b7280"
  }
};