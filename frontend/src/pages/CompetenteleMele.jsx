import { API_URL } from "../services/api";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";

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
  const [catalogSkills, setCatalogSkills] = useState([]);

  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [selectedLevel, setSelectedLevel] = useState(1);

  const [cvFile, setCvFile] = useState(null);
  const [cvFileName, setCvFileName] = useState("");
  const [detectedSkills, setDetectedSkills] = useState([]);
  const [loadingCV, setLoadingCV] = useState(false);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("category"); // "category" | "alpha" | "level"

  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchMySkills();
    fetchCatalogSkills();
  }, []);

  const availableSkills = useMemo(() => {
    return catalogSkills.filter(
      (s) => !mySkills.some((ms) => Number(ms.skill_id) === Number(s.id))
    );
  }, [catalogSkills, mySkills]);

  const filteredSkills = useMemo(() => {
    let skills = [...mySkills];
    if (search.trim()) {
      const q = search.toLowerCase();
      skills = skills.filter(
        (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
      );
    }
    if (sortBy === "category") {
      skills.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    } else if (sortBy === "level") {
      // Descrescător — Avansat primul
      skills.sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
    } else {
      skills.sort((a, b) => a.name.localeCompare(b.name));
    }
    return skills;
  }, [mySkills, search, sortBy]);

  const skillsByCategory = useMemo(() => {
    if (sortBy !== "category") return null;
    const groups = {};
    for (const skill of filteredSkills) {
      if (!groups[skill.category]) groups[skill.category] = [];
      groups[skill.category].push(skill);
    }
    return groups;
  }, [filteredSkills, sortBy]);

  async function fetchMySkills() {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/api/user-skills`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) setMySkills(data.skills || []);
    } catch (err) { console.error(err); }
  }

  async function fetchCatalogSkills() {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/api/skills`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) setCatalogSkills(data.skills || []);
    } catch (err) { console.error(err); }
  }

  async function handleAddSkill(e) {
    e.preventDefault();
    setMessage("");
    if (!selectedSkillId) { setMessage("Selectează o competență."); return; }
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/api/user-skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ skillId: Number(selectedSkillId), level: Number(selectedLevel), confidence: 3 })
      });
      const data = await res.json();
      if (data.ok) {
        setMessage("Competența a fost adăugată.");
        setSelectedSkillId("");
        setSelectedLevel(1);
        await fetchMySkills();
      } else {
        setMessage(data.error || "Nu s-a putut adăuga competența.");
      }
    } catch (err) {
      setMessage("Eroare la adăugarea competenței.");
    }
  }

  async function handleUploadCV() {
    setMessage("");
    if (!cvFile) { setMessage("Selectează un CV."); return; }
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("cv", cvFile);
    setLoadingCV(true);
    try {
      const res = await fetch(`${API_URL}/api/cv/extract`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.ok) {
        setDetectedSkills(data.detectedSkills || []);
        setMessage(`CV analizat — ${data.detectedSkills?.filter(s => s.isNew).length || 0} competențe noi detectate.`);
      } else {
        setMessage(data.error || "Nu s-a putut analiza CV-ul.");
      }
    } catch (err) {
      setMessage("Eroare la analizarea CV-ului.");
    } finally {
      setLoadingCV(false);
    }
  }

  async function addSkillFromCV(skillId) {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/api/user-skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ skillId: Number(skillId), level: 2, confidence: 2 })
      });
      const data = await res.json();
      if (data.ok) {
        await fetchMySkills();
        setDetectedSkills((prev) =>
          prev.map((s) => Number(s.skillId) === Number(skillId) ? { ...s, isNew: false } : s)
        );
      }
    } catch (err) { console.error(err); }
  }

  async function updateSkillLevel(skillId, level) {
    const token = localStorage.getItem("token");
    try {
      await fetch(`${API_URL}/api/user-skills/${skillId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ level: Number(level) })
      });
      await fetchMySkills();
    } catch (err) { console.error(err); }
  }

  async function deleteSkill(skillId) {
    if (!window.confirm("Sigur vrei să ștergi această competență?")) return;
    const token = localStorage.getItem("token");
    try {
      await fetch(`${API_URL}/api/user-skills/${skillId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchMySkills();
      setDetectedSkills((prev) =>
        prev.map((s) => Number(s.skillId) === Number(skillId) ? { ...s, isNew: true } : s)
      );
    } catch (err) { console.error(err); }
  }

  return (
    <AppLayout
      title="Competențele mele"
      subtitle="Administrează și actualizează profilul tău de competențe"
    >
      {message && <div style={styles.message}>{message}</div>}

      <div style={styles.layout}>

        {/* ══ STÂNGA — Lista competențelor ══ */}
        <div style={styles.leftCol}>
          <div style={styles.card}>

            <div style={styles.listHeader}>
              <div style={styles.sectionLabel}>
                Competențele tale
                <span style={styles.countBadge}>{mySkills.length}</span>
              </div>
              <div style={styles.listControls}>
                <input
                  type="text"
                  placeholder="Caută..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={styles.searchInput}
                />
                <div style={styles.sortButtons}>
                  <button
                    type="button"
                    style={{ ...styles.sortBtn, background: sortBy === "category" ? "#111827" : "white", color: sortBy === "category" ? "white" : "#374151" }}
                    onClick={() => setSortBy("category")}
                  >
                    Categorie
                  </button>
                  <button
                    type="button"
                    style={{ ...styles.sortBtn, background: sortBy === "alpha" ? "#111827" : "white", color: sortBy === "alpha" ? "white" : "#374151" }}
                    onClick={() => setSortBy("alpha")}
                  >
                    A–Z
                  </button>
                  <button
                    type="button"
                    style={{ ...styles.sortBtn, background: sortBy === "level" ? "#111827" : "white", color: sortBy === "level" ? "white" : "#374151" }}
                    onClick={() => setSortBy("level")}
                  >
                    Nivel
                  </button>
                </div>
              </div>
            </div>

            {mySkills.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: 32 }}>🧠</div>
                <div style={styles.emptyText}>
                  Nu ai adăugat încă nicio competență.
                  Adaugă manual sau importă din CV.
                </div>
              </div>
            ) : filteredSkills.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyText}>Niciun rezultat pentru „{search}"</div>
              </div>
            ) : sortBy === "category" && skillsByCategory ? (
              Object.entries(skillsByCategory).map(([category, skills]) => {
                const color = CATEGORY_COLORS[category] || "#6b7280";
                return (
                  <div key={category} style={styles.categoryGroup}>
                    <div style={styles.categoryGroupHeader}>
                      <span style={{ ...styles.dot, background: color, width: 8, height: 8 }} />
                      <span style={{ ...styles.categoryGroupName, color }}>{category}</span>
                      <span style={styles.categoryGroupCount}>{skills.length}</span>
                    </div>
                    {skills.map((skill) => (
                      <SkillRow key={skill.skill_id} skill={skill} color={color}
                        onUpdateLevel={updateSkillLevel} onDelete={deleteSkill} />
                    ))}
                  </div>
                );
              })
            ) : sortBy === "level" ? (
              // Sortare după nivel — Avansat primul, badge nivel vizibil
              filteredSkills.map((skill) => {
                const color = CATEGORY_COLORS[skill.category] || "#6b7280";
                return (
                  <SkillRow key={skill.skill_id} skill={skill} color={color}
                    showLevelBadge onUpdateLevel={updateSkillLevel} onDelete={deleteSkill} />
                );
              })
            ) : (
              filteredSkills.map((skill) => {
                const color = CATEGORY_COLORS[skill.category] || "#6b7280";
                return (
                  <SkillRow key={skill.skill_id} skill={skill} color={color}
                    onUpdateLevel={updateSkillLevel} onDelete={deleteSkill} />
                );
              })
            )}
          </div>
        </div>

        {/* ══ DREAPTA — Import CV + Adaugă manual ══ */}
        <div style={styles.rightCol}>

          {/* Import CV */}
          <div style={styles.card}>
            <div style={styles.sectionLabel}>Import din CV</div>

            <label style={styles.uploadArea}>
              <input
                type="file"
                accept=".pdf,.docx"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) { setCvFile(file); setCvFileName(file.name); setDetectedSkills([]); }
                }}
              />
              {cvFileName ? (
                <div style={styles.uploadSelected}>
                  <span style={{ fontSize: 20 }}>📄</span>
                  <span style={styles.uploadFileName}>{cvFileName}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setCvFile(null);
                      setCvFileName("");
                      setDetectedSkills([]);
                    }}
                    style={{
                      width: 22, height: 22, borderRadius: "50%",
                      border: "1px solid #fecaca", background: "#fff5f5",
                      color: "#dc2626", cursor: "pointer", fontSize: 11,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, fontFamily: "inherit"
                    }}
                    title="Șterge fișierul"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div style={styles.uploadPlaceholder}>
                  <span style={{ fontSize: 28, color: "#d1d5db" }}>⬆</span>
                  <span style={{ fontSize: 13, color: "#6b7280" }}>Apasă pentru a selecta fișierul</span>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>PDF sau DOCX</span>
                </div>
              )}
            </label>

            <button
              onClick={handleUploadCV}
              disabled={!cvFile || loadingCV}
              style={{ ...styles.primaryBtn, opacity: !cvFile || loadingCV ? 0.5 : 1, marginTop: 12, width: "100%" }}
              type="button"
            >
              {loadingCV ? "Se analizează..." : "Analizează CV"}
            </button>

            {detectedSkills.length > 0 && (
              <div style={styles.cvResults}>
                <div style={styles.cvResultsHeader}>
                  {detectedSkills.filter((s) => s.isNew).length} competențe noi detectate
                </div>
                {detectedSkills.map((skill) => {
                  const color = CATEGORY_COLORS[skill.category] || "#6b7280";
                  return (
                    <div key={skill.skillId} style={styles.cvSkillRow}>
                      <div style={styles.cvSkillInfo}>
                        <span style={{ ...styles.dot, background: color }} />
                        <span style={{ fontSize: 13, color: "#111827", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {skill.name}
                        </span>
                        <span style={{ fontSize: 10, color, background: color + "18", padding: "1px 6px", borderRadius: 3, fontWeight: 600, whiteSpace: "nowrap" }}>
                          {skill.category}
                        </span>
                      </div>
                      {skill.isNew ? (
                        <button type="button" style={styles.addBtn} onClick={() => addSkillFromCV(skill.skillId)}>
                          + Adaugă
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600, whiteSpace: "nowrap" }}>✓ Adăugat</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Adaugă manual */}
          <div style={styles.card}>
            <div style={styles.sectionLabel}>Adaugă manual</div>

            <form onSubmit={handleAddSkill} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <select
                style={styles.select}
                value={selectedSkillId}
                onChange={(e) => setSelectedSkillId(e.target.value)}
              >
                <option value="">Selectează competența</option>
                {availableSkills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name} — {skill.category}
                  </option>
                ))}
              </select>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ fontSize: 13, color: "#6b7280", minWidth: 36, paddingTop: 10 }}>Nivel</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  {[1, 2, 3].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSelectedLevel(lvl)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: selectedLevel === lvl ? "2px solid #111827" : "1px solid #e5e7eb",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        background: selectedLevel === lvl ? "#111827" : "white",
                        textAlign: "left",
                        width: "100%"
                      }}
                    >
                      <span style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: selectedLevel === lvl ? "white" : "#111827"
                      }}>
                        {LEVEL_LABELS[lvl]}
                      </span>
                      <span style={{
                        fontSize: 11,
                        color: selectedLevel === lvl ? "#d1d5db" : "#9ca3af",
                        marginTop: 2,
                        lineHeight: 1.4
                      }}>
                        {LEVEL_DESCRIPTIONS[lvl]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!selectedSkillId}
                style={{ ...styles.primaryBtn, width: "100%", opacity: !selectedSkillId ? 0.5 : 1 }}
              >
                Adaugă competență
              </button>
            </form>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}

function SkillRow({ skill, color, onUpdateLevel, onDelete, showLevelBadge }) {
  return (
    <div style={styles.skillRow}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
        <span style={{ ...styles.dot, background: color }} />
        <span style={{ fontSize: 14, color: "#111827", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {skill.name}
        </span>
        {showLevelBadge && (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
            background: skill.level === 3 ? "#111827" : skill.level === 2 ? "#f3f4f6" : "#fafafa",
            color: skill.level === 3 ? "white" : "#374151",
            border: "1px solid #e5e7eb",
            whiteSpace: "nowrap", flexShrink: 0
          }}>
            {LEVEL_LABELS[skill.level]}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <select
          value={skill.level}
          onChange={(e) => onUpdateLevel(skill.skill_id, e.target.value)}
          style={styles.levelSelect}
        >
          {[1, 2, 3].map((l) => (
            <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
          ))}
        </select>
        <button
          type="button"
          style={styles.deleteBtn}
          onClick={() => onDelete(skill.skill_id)}
          title="Șterge"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

const styles = {
  message: {
    marginBottom: 16, padding: 12, borderRadius: 12,
    background: "#ecfdf5", color: "#166534", border: "1px solid #bbf7d0"
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "1fr 320px",
    gap: 20,
    alignItems: "start"
  },
  leftCol: { display: "flex", flexDirection: "column" },
  rightCol: { display: "flex", flexDirection: "column", gap: 16 },
  card: {
    background: "white", borderRadius: 16, padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)"
  },
  sectionLabel: {
    color: "#6b7280", fontSize: 11, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: 1.2,
    marginBottom: 16, display: "flex", alignItems: "center", gap: 8
  },
  countBadge: {
    background: "#f3f4f6", color: "#374151",
    fontSize: 11, fontWeight: 700, padding: "1px 8px", borderRadius: 999
  },
  listHeader: {
    display: "flex", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10
  },
  listControls: { display: "flex", gap: 8, alignItems: "center" },
  searchInput: {
    padding: "7px 12px", border: "1px solid #e5e7eb",
    borderRadius: 8, fontSize: 13, width: 150, outline: "none"
  },
  sortButtons: {
    display: "flex", border: "1px solid #e5e7eb",
    borderRadius: 8, overflow: "hidden"
  },
  sortBtn: {
    padding: "7px 12px", border: "none",
    fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit"
  },
  emptyState: {
    display: "flex", flexDirection: "column",
    alignItems: "center", padding: "32px 20px", gap: 10
  },
  emptyText: { fontSize: 14, color: "#9ca3af", textAlign: "center", lineHeight: 1.6 },
  categoryGroup: { marginBottom: 8 },
  categoryGroupHeader: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 0 4px", borderBottom: "1px solid #f3f4f6", marginBottom: 4
  },
  categoryGroupName: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, flex: 1 },
  categoryGroupCount: {
    fontSize: 11, color: "#9ca3af", background: "#f3f4f6",
    padding: "1px 7px", borderRadius: 999
  },
  skillRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "9px 4px", borderBottom: "1px solid #f9fafb", gap: 12
  },
  dot: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },
  levelSelect: {
    padding: "5px 8px", border: "1px solid #e5e7eb",
    borderRadius: 6, fontSize: 12, color: "#374151", background: "#f9fafb", cursor: "pointer"
  },
  deleteBtn: {
    width: 28, height: 28, border: "1px solid #fecaca",
    background: "#fff5f5", color: "#dc2626", borderRadius: 6,
    cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center"
  },
  uploadArea: {
    display: "block", border: "2px dashed #e5e7eb",
    borderRadius: 10, padding: 16, cursor: "pointer", textAlign: "center"
  },
  uploadSelected: { display: "flex", alignItems: "center", gap: 8, justifyContent: "center" },
  uploadFileName: {
    fontSize: 13, color: "#111827", fontWeight: 500,
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160
  },
  uploadPlaceholder: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
  cvResults: { marginTop: 16, borderTop: "1px solid #f3f4f6", paddingTop: 14 },
  cvResultsHeader: { fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 10 },
  cvSkillRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "7px 0", borderBottom: "1px solid #f9fafb", gap: 8
  },
  cvSkillInfo: { display: "flex", alignItems: "center", gap: 7, flex: 1, minWidth: 0 },
  addBtn: {
    padding: "4px 10px", background: "#111827", color: "white",
    border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600,
    cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit"
  },
  select: {
    padding: "10px 12px", border: "1px solid #e5e7eb",
    borderRadius: 8, fontSize: 13, color: "#374151", width: "100%", background: "white"
  },
  primaryBtn: {
    padding: "10px 14px", background: "#111827", color: "white",
    border: "none", borderRadius: 8, cursor: "pointer",
    fontWeight: 600, fontSize: 14, fontFamily: "inherit"
  }
};