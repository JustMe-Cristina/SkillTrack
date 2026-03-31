import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";
import { apiFetch, apiUpload } from "../services/api";

const CATEGORY_COLORS = {
  Data: "#3b82f6",
  ML: "#8b5cf6",
  DevOps: "#f59e0b",
  Dev: "#10b981",
  Business: "#ef4444"
};

const LEVEL_LABELS = {
  1: "Fundamental",
  2: "Independent",
  3: "Avansat"
};

const LEVEL_DESCRIPTIONS = {
  1: "Am noțiuni de bază, am folosit rar sau cu îndrumare.",
  2: "Lucrez singur cu această competență în situații uzuale.",
  3: "Pot rezolva situații complexe și ghida colegi."
};

export default function CompetenteleMele() {
  const [mySkills, setMySkills] = useState([]);
  const [allSkills, setAllSkills] = useState([]);

  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("2");

  const [cvFile, setCvFile] = useState(null);
  const [detectedSkills, setDetectedSkills] = useState([]);

  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [loadingDeleteId, setLoadingDeleteId] = useState(null);
  const [loadingCV, setLoadingCV] = useState(false);
  const [loadingApplyCV, setLoadingApplyCV] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoadingPage(true);
    setError("");
    setMessage("");

    try {
      const [mySkillsData, allSkillsData] = await Promise.all([
        apiFetch("/api/user-skills"),
        apiFetch("/api/skills")
      ]);

      setMySkills(normalizeMySkills(mySkillsData));
      setAllSkills(normalizeAllSkills(allSkillsData));
    } catch (err) {
      console.error("LOAD SKILLS ERROR:", err);
      setError(err.message || "Nu s-au putut încărca datele.");
    } finally {
      setLoadingPage(false);
    }
  }

  function normalizeMySkills(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.skills)) return data.skills;
    if (Array.isArray(data.userSkills)) return data.userSkills;
    return [];
  }

  function normalizeAllSkills(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.skills)) return data.skills;
    return [];
  }

  function getSkillId(skill) {
    return Number(skill.skillId ?? skill.skill_id ?? skill.id);
  }

  function getSkillLevel(skill) {
    return Number(skill.level ?? skill.current_level ?? 2);
  }

  function getCategoryColor(category) {
    return CATEGORY_COLORS[category] || "#6b7280";
  }

  const mySkillIds = useMemo(() => {
    return new Set(mySkills.map((skill) => getSkillId(skill)));
  }, [mySkills]);

  const availableSkills = useMemo(() => {
    return allSkills.filter((skill) => !mySkillIds.has(Number(skill.id)));
  }, [allSkills, mySkillIds]);

  const groupedMySkills = useMemo(() => {
    const groups = {};

    for (const skill of mySkills) {
      const category = skill.category || "Altele";

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(skill);
    }

    return Object.entries(groups).sort((a, b) =>
      a[0].localeCompare(b[0], "ro")
    );
  }, [mySkills]);

  async function fetchMySkills() {
    try {
      const data = await apiFetch("/api/user-skills");
      setMySkills(normalizeMySkills(data));
    } catch (err) {
      console.error("FETCH MY SKILLS ERROR:", err);
      setError(err.message || "Nu s-au putut actualiza competențele.");
    }
  }

  async function handleAddSkill(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!selectedSkillId) {
      setError("Selectează o competență.");
      return;
    }

    setLoadingAdd(true);

    try {
      await apiFetch("/api/user-skills", {
        method: "POST",
        body: JSON.stringify({
          skillId: Number(selectedSkillId),
          level: Number(selectedLevel)
        })
      });

      const addedSkill = allSkills.find(
        (skill) => Number(skill.id) === Number(selectedSkillId)
      );

      setSelectedSkillId("");
      setSelectedLevel("2");
      setMessage(
        addedSkill
          ? `Competența „${addedSkill.name}” a fost adăugată.`
          : "Competența a fost adăugată."
      );

      await fetchMySkills();
    } catch (err) {
      console.error("ADD SKILL ERROR:", err);
      setError(err.message || "Nu s-a putut adăuga competența.");
    } finally {
      setLoadingAdd(false);
    }
  }

  async function handleDeleteSkill(skillId, skillName) {
    setMessage("");
    setError("");
    setLoadingDeleteId(skillId);

    try {
      await apiFetch(`/api/user-skills/${skillId}`, {
        method: "DELETE"
      });

      setMessage(`Competența „${skillName}” a fost eliminată.`);
      await fetchMySkills();
    } catch (err) {
      console.error("DELETE SKILL ERROR:", err);
      setError(err.message || "Nu s-a putut șterge competența.");
    } finally {
      setLoadingDeleteId(null);
    }
  }

  async function handleAnalyzeCV() {
    setMessage("");
    setError("");

    if (!cvFile) {
      setError("Selectează un fișier CV în format PDF sau DOCX.");
      return;
    }

    const formData = new FormData();
    formData.append("cv", cvFile);

    setLoadingCV(true);

    try {
      const data = await apiUpload("/api/cv/extract", formData);

      setDetectedSkills(data.detectedSkills || []);
      setMessage(
        "CV analizat. Selectează competențele noi pe care vrei să le adaugi."
      );
    } catch (err) {
      console.error("CV EXTRACT ERROR:", err);
      setError(err.message || "Eroare la analizarea CV-ului.");
    } finally {
      setLoadingCV(false);
    }
  }
  function handleClearCVFile() {
  setCvFile(null);
  setDetectedSkills([]);
  setMessage("");
  setError("");

  const fileInput = document.getElementById("cv-upload-input");
  if (fileInput) {
    fileInput.value = "";
  }
}
  function toggleDetectedSkill(skillId) {
    setDetectedSkills((prev) =>
      prev.map((skill) =>
        Number(skill.skillId) === Number(skillId) && !skill.alreadyAdded
          ? { ...skill, selected: !skill.selected }
          : skill
      )
    );
  }

  function updateDetectedSkillLevel(skillId, level) {
    setDetectedSkills((prev) =>
      prev.map((skill) =>
        Number(skill.skillId) === Number(skillId) && !skill.alreadyAdded
          ? { ...skill, level: Number(level) }
          : skill
      )
    );
  }

  async function handleApplyDetectedSkills() {
    setMessage("");
    setError("");

    const selectedSkills = detectedSkills.filter(
      (skill) => skill.selected && !skill.alreadyAdded
    );

    if (selectedSkills.length === 0) {
      setError("Nu ai selectat nicio competență nouă pentru adăugare.");
      return;
    }

    setLoadingApplyCV(true);

    try {
      const data = await apiFetch("/api/cv/apply", {
        method: "POST",
        body: JSON.stringify({
          skills: selectedSkills.map((skill) => ({
            skillId: Number(skill.skillId),
            level: Number(skill.level || 2)
          }))
        })
      });

      setMessage(
        `Au fost adăugate ${data.importedCount || 0} competențe selectate.`
      );

      await fetchMySkills();

      setDetectedSkills((prev) =>
        prev.map((skill) =>
          skill.selected && !skill.alreadyAdded
            ? { ...skill, alreadyAdded: true, selected: false }
            : skill
        )
      );
    } catch (err) {
      console.error("CV APPLY ERROR:", err);
      setError(err.message || "Nu s-au putut salva competențele selectate.");
    } finally {
      setLoadingApplyCV(false);
    }
  }

  return (
    <AppLayout>
      <div style={styles.page}>
        <div style={styles.headerCard}>
          <div style={styles.headerTextWrap}>
            <h1 style={styles.title}>Competențele mele</h1>
            <p style={styles.subtitle}>
              Gestionează competențele tale manual sau extrage competențe din CV.
              După analiză, alegi exact ce vrei să adaugi în profil.
            </p>
          </div>

          <div style={styles.statsWrap}>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{mySkills.length}</div>
              <div style={styles.statLabel}>Competențe salvate</div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statValue}>{detectedSkills.length}</div>
              <div style={styles.statLabel}>Detectate din ultimul CV</div>
            </div>
          </div>
        </div>

        {(message || error) && (
          <div
            style={{
              ...styles.feedback,
              ...(error ? styles.feedbackError : styles.feedbackSuccess)
            }}
          >
            {error || message}
          </div>
        )}

        <div style={styles.grid}>
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Adaugă competență manual</h2>
            <p style={styles.cardText}>
              Selectează o competență din catalog și stabilește nivelul tău
              actual.
            </p>

            <form onSubmit={handleAddSkill} style={styles.form}>
              <select
                value={selectedSkillId}
                onChange={(e) => setSelectedSkillId(e.target.value)}
                style={styles.select}
                disabled={loadingAdd || availableSkills.length === 0}
              >
                <option value="">Selectează o competență</option>
                {availableSkills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                    {skill.category ? ` — ${skill.category}` : ""}
                  </option>
                ))}
              </select>

              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                style={styles.select}
                disabled={loadingAdd}
              >
                <option value="1">
                  {LEVEL_LABELS[1]} — {LEVEL_DESCRIPTIONS[1]}
                </option>
                <option value="2">
                  {LEVEL_LABELS[2]} — {LEVEL_DESCRIPTIONS[2]}
                </option>
                <option value="3">
                  {LEVEL_LABELS[3]} — {LEVEL_DESCRIPTIONS[3]}
                </option>
              </select>

              <button
                type="submit"
                style={{
                  ...styles.primaryButton,
                  opacity: loadingAdd ? 0.7 : 1
                }}
                disabled={loadingAdd || !selectedSkillId}
              >
                {loadingAdd ? "Se adaugă..." : "Adaugă competență"}
              </button>
            </form>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Analizează CV-ul</h2>
            <p style={styles.cardText}>
              Încarcă un fișier PDF sau DOCX. Sistemul detectează competențele,
              iar tu decizi manual ce vrei să adaugi în profil.
            </p>

            <div style={styles.uploadBox}>
              <input
                id="cv-upload-input"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                style={styles.fileInput}
                disabled={loadingCV || loadingApplyCV}
              />

              <div style={styles.fileInfo}>
  {cvFile ? (
    <div style={styles.fileInfoRow}>
      <div style={styles.fileInfoText}>
        <strong>Fișier selectat:</strong> {cvFile.name}
      </div>

      <button
        type="button"
        onClick={handleClearCVFile}
        style={styles.clearFileButton}
        disabled={loadingCV || loadingApplyCV}
        aria-label="Șterge fișierul selectat"
        title="Șterge fișierul selectat"
      >
        ×
      </button>
    </div>
  ) : (
    "Nu ai selectat încă niciun fișier."
  )}
</div>

              <button
                type="button"
                onClick={handleAnalyzeCV}
                style={{
                  ...styles.primaryButton,
                  opacity: loadingCV ? 0.7 : 1
                }}
                disabled={loadingCV || loadingApplyCV}
              >
                {loadingCV ? "Se analizează CV-ul..." : "Analizează CV"}
              </button>
            </div>

            {detectedSkills.length > 0 && (
              <div style={styles.detectedBox}>
                <h3 style={styles.detectedTitle}>Competențe detectate</h3>

                <div style={styles.detectedList}>
                  {detectedSkills.map((skill) => {
                    const color = getCategoryColor(skill.category);
                    const level = Number(skill.level || 2);

                    return (
                      <div
                        key={skill.skillId}
                        style={{
                          ...styles.detectedSkillRow,
                          opacity: skill.alreadyAdded ? 0.72 : 1
                        }}
                      >
                        <div style={styles.detectedCheckboxWrap}>
                          <input
                            type="checkbox"
                            checked={!!skill.selected}
                            disabled={skill.alreadyAdded || loadingApplyCV}
                            onChange={() => toggleDetectedSkill(skill.skillId)}
                          />
                        </div>

                        <div style={styles.detectedSkillContent}>
                          <div style={styles.detectedSkillTopRow}>
                            <span
                              style={{
                                ...styles.detectedTag,
                                background: `${color}18`,
                                border: `1px solid ${color}40`,
                                color
                              }}
                            >
                              {skill.name}
                              {skill.category ? ` • ${skill.category}` : ""}
                            </span>

                            {skill.alreadyAdded && (
                              <span style={styles.alreadyAddedText}>
                                Deja există în lista ta
                              </span>
                            )}
                          </div>

                          {!skill.alreadyAdded && (
                            <div style={styles.detectedSkillControls}>
                              <label style={styles.levelLabel}>
                                Nivel:
                                <select
                                  value={String(level)}
                                  onChange={(e) =>
                                    updateDetectedSkillLevel(
                                      skill.skillId,
                                      e.target.value
                                    )
                                  }
                                  style={styles.levelSelect}
                                  disabled={loadingApplyCV}
                                >
                                  <option value="1">{LEVEL_LABELS[1]}</option>
                                  <option value="2">{LEVEL_LABELS[2]}</option>
                                  <option value="3">{LEVEL_LABELS[3]}</option>
                                </select>
                              </label>

                              <div style={styles.levelDescriptionInline}>
                                {LEVEL_DESCRIPTIONS[level]}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleApplyDetectedSkills}
                  style={{
                    ...styles.primaryButton,
                    marginTop: "16px",
                    opacity: loadingApplyCV ? 0.7 : 1
                  }}
                  disabled={loadingApplyCV}
                >
                  {loadingApplyCV
                    ? "Se adaugă competențele..."
                    : "Adaugă competențele selectate"}
                </button>
              </div>
            )}
          </section>
        </div>

        <section style={styles.card}>
          <div style={styles.skillsHeader}>
            <div>
              <h2 style={styles.cardTitle}>Lista competențelor tale</h2>
              <p style={styles.cardText}>
                Competențele sunt grupate pe categorii și afișate împreună cu
                nivelul curent.
              </p>
            </div>
          </div>

          {loadingPage ? (
            <div style={styles.emptyState}>Se încarcă competențele...</div>
          ) : mySkills.length === 0 ? (
            <div style={styles.emptyState}>
              Nu ai încă nicio competență salvată. Adaugă una manual sau
              analizează CV-ul pentru detectare asistată.
            </div>
          ) : (
            <div style={styles.categoryList}>
              {groupedMySkills.map(([category, skills]) => {
                const color = getCategoryColor(category);

                return (
                  <div key={category} style={styles.categoryBlock}>
                    <div style={styles.categoryTitleRow}>
                      <div style={styles.categoryTitleWrap}>
                        <span
                          style={{
                            ...styles.categoryDot,
                            background: color
                          }}
                        />
                        <h3 style={styles.categoryTitle}>{category}</h3>
                      </div>

                      <span style={styles.categoryCount}>
                        {skills.length}{" "}
                        {skills.length === 1 ? "competență" : "competențe"}
                      </span>
                    </div>

                    <div style={styles.skillList}>
                      {skills.map((skill) => {
                        const skillId = getSkillId(skill);
                        const level = getSkillLevel(skill);
                        const skillColor = getCategoryColor(skill.category);

                        return (
                          <div
                            key={skillId}
                            style={{
                              ...styles.skillCard,
                              borderLeft: `5px solid ${skillColor}`
                            }}
                          >
                            <div style={styles.skillContent}>
                              <div style={styles.skillTopRow}>
                                <div>
                                  <div style={styles.skillName}>{skill.name}</div>
                                  <div style={styles.skillMeta}>
                                    {skill.category || "Altele"}
                                  </div>
                                </div>

                                <span
                                  title={LEVEL_DESCRIPTIONS[level] || ""}
                                  style={{
                                    ...styles.levelBadge,
                                    background: `${skillColor}16`,
                                    border: `1px solid ${skillColor}35`,
                                    color: skillColor
                                  }}
                                >
                                  {LEVEL_LABELS[level] || "Nivel nedefinit"}
                                </span>
                              </div>

                              <div style={styles.levelDescription}>
                                {LEVEL_DESCRIPTIONS[level] ||
                                  "Nivelul de competență nu este specificat."}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteSkill(skillId, skill.name)
                              }
                              style={{
                                ...styles.deleteButton,
                                opacity: loadingDeleteId === skillId ? 0.7 : 1
                              }}
                              disabled={loadingDeleteId === skillId}
                            >
                              {loadingDeleteId === skillId
                                ? "Se șterge..."
                                : "Șterge"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    padding: "24px"
  },
  headerCard: {
    background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
    border: "1px solid #e5e7eb",
    borderRadius: "24px",
    padding: "24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    flexWrap: "wrap",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)"
  },
  headerTextWrap: {
    maxWidth: "760px"
  },
  title: {
    margin: 0,
    fontSize: "32px",
    fontWeight: 800,
    color: "#111827"
  },
  subtitle: {
    margin: "8px 0 0 0",
    fontSize: "15px",
    color: "#4b5563",
    lineHeight: 1.6
  },
  statsWrap: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap"
  },
  statCard: {
    minWidth: "160px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "16px 18px",
    boxShadow: "0 6px 20px rgba(15, 23, 42, 0.05)"
  },
  statValue: {
    fontSize: "28px",
    fontWeight: 800,
    color: "#111827"
  },
  statLabel: {
    marginTop: "6px",
    fontSize: "13px",
    color: "#6b7280"
  },
  feedback: {
    borderRadius: "16px",
    padding: "14px 16px",
    fontSize: "14px",
    fontWeight: 600
  },
  feedbackSuccess: {
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    color: "#065f46"
  },
  feedbackError: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#991b1b"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: "24px"
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "24px",
    padding: "24px",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)"
  },
  cardTitle: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 700,
    color: "#111827"
  },
  cardText: {
    margin: "10px 0 0 0",
    fontSize: "14px",
    color: "#6b7280",
    lineHeight: 1.6
  },
  form: {
    marginTop: "18px",
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  select: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "14px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
    background: "#ffffff",
    outline: "none"
  },
  primaryButton: {
    border: "none",
    borderRadius: "14px",
    padding: "12px 16px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    background: "#111827",
    color: "#ffffff"
  },
  uploadBox: {
    marginTop: "18px",
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  fileInput: {
    fontSize: "14px"
  },
  fileInfo: {
    fontSize: "14px",
    color: "#4b5563",
    lineHeight: 1.5
  },
  fileInfoRow: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "10px 12px",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  background: "#f9fafb"
},
fileInfoText: {
  fontSize: "14px",
  color: "#374151",
  lineHeight: 1.5,
  wordBreak: "break-word",
  flex: 1
},
clearFileButton: {
  width: "32px",
  height: "32px",
  borderRadius: "999px",
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#b91c1c",
  fontSize: "20px",
  lineHeight: 1,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0
},
  detectedBox: {
    marginTop: "18px",
    padding: "16px",
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "16px"
  },
  detectedTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 700,
    color: "#111827"
  },
  detectedList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "14px"
  },
  detectedSkillRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "12px",
    borderRadius: "14px",
    border: "1px solid #e5e7eb",
    background: "#ffffff"
  },
  detectedCheckboxWrap: {
    paddingTop: "4px"
  },
  detectedSkillContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  detectedSkillTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap"
  },
  detectedTag: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: 600
  },
  detectedSkillControls: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  levelLabel: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#374151"
  },
  levelSelect: {
    padding: "8px 10px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "13px",
    background: "#ffffff"
  },
  levelDescriptionInline: {
    fontSize: "12px",
    color: "#6b7280",
    lineHeight: 1.5
  },
  alreadyAddedText: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#6b7280"
  },
  skillsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap"
  },
  emptyState: {
    marginTop: "18px",
    padding: "24px",
    textAlign: "center",
    background: "#f9fafb",
    border: "1px dashed #d1d5db",
    borderRadius: "18px",
    color: "#6b7280",
    fontSize: "15px"
  },
  categoryList: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    marginTop: "20px"
  },
  categoryBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "14px"
  },
  categoryTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap"
  },
  categoryTitleWrap: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  categoryDot: {
    width: "12px",
    height: "12px",
    borderRadius: "999px",
    display: "inline-block"
  },
  categoryTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 700,
    color: "#111827"
  },
  categoryCount: {
    fontSize: "13px",
    color: "#6b7280",
    fontWeight: 600
  },
  skillList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "14px"
  },
  skillCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "14px",
    padding: "16px",
    borderRadius: "18px",
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.04)"
  },
  skillContent: {
    flex: 1,
    minWidth: 0
  },
  skillTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px"
  },
  skillName: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#111827"
  },
  skillMeta: {
    marginTop: "4px",
    fontSize: "13px",
    color: "#6b7280"
  },
  levelBadge: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "12px",
    fontWeight: 700,
    whiteSpace: "nowrap"
  },
  levelDescription: {
    marginTop: "10px",
    fontSize: "13px",
    lineHeight: 1.5,
    color: "#4b5563"
  },
  deleteButton: {
    border: "1px solid #fecaca",
    background: "#fff1f2",
    color: "#b91c1c",
    borderRadius: "12px",
    padding: "10px 12px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap"
  }
};