import { useEffect, useMemo, useRef, useState } from "react";
import AppLayout from "../components/AppLayout";
import { apiFetch, apiUpload } from "../services/api";
import MesajFeedback from "../components/MesajFeedback";

const CATEGORY_COLORS = {
  Data: "#3b82f6",
  BI: "#0ea5e9",
  ML: "#8b5cf6",
  "AI / ML": "#8b5cf6",
  AI_ML: "#8b5cf6",
  DevOps: "#f59e0b",
  Dev: "#10b981",
  Frontend: "#14b8a6",
  Backend: "#22c55e",
  Business: "#ef4444",
  PM: "#f97316",
  QA: "#6366f1",
  Tools: "#64748b",
  "Soft Skills": "#ec4899",
  Altele: "#6b7280"
};

const LEVEL_LABELS = {
  1: "Nivel fundamental",
  2: "Nivel intermediar",
  3: "Nivel avansat"
};

const LEVEL_DESCRIPTIONS = {
  1: "Am noțiuni de bază și pot aplica skillul în situații simple, cu ghidare sau pe exemple clare.",
  2: "Pot lucra independent cu această competență în situații uzuale.",
  3: "Pot rezolva situații complexe și pot ghida alte persoane."
};

const LEVEL_OPTIONS = [
  { value: "1", label: "Fundamental" },
  { value: "2", label: "Intermediar" },
  { value: "3", label: "Avansat" }
];

function normalizeCategory(category) {
  if (!category) return "Altele";

  const value = String(category).trim();

  const map = {
    DATA: "Data",
    BI: "BI",
    BUSINESS: "Business",
    PM: "PM",
    QA: "QA",
    DEV: "Dev",
    DEVOPS: "DevOps",
    FRONTEND: "Frontend",
    BACKEND: "Backend",
    AI_ML: "AI / ML",
    ML: "ML",
    TOOLS: "Tools",
    SOFT_SKILLS: "Soft Skills"
  };

  return map[value.toUpperCase()] || value;
}

function formatFileSize(bytes) {
  if (!bytes) return "";

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${Math.round(kb)} KB`;
  }

  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function CompetenteleMele() {
  const fileInputRef = useRef(null);

  const [mySkills, setMySkills] = useState([]);
  const [allSkills, setAllSkills] = useState([]);

  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("2");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [showSkillsList, setShowSkillsList] = useState(false);

  const [cvFile, setCvFile] = useState(null);
  const [detectedSkills, setDetectedSkills] = useState([]);

  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [loadingDeleteId, setLoadingDeleteId] = useState(null);
  const [loadingUpdateId, setLoadingUpdateId] = useState(null);
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
    if (Array.isArray(data?.skills)) return data.skills;
    if (Array.isArray(data?.userSkills)) return data.userSkills;
    return [];
  }

  function normalizeAllSkills(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.skills)) return data.skills;
    return [];
  }

  function getSkillId(skill) {
    return Number(skill.skillId ?? skill.skill_id ?? skill.id);
  }

  function getSkillLevel(skill) {
    return Number(skill.level ?? skill.current_level ?? 2);
  }

  function getSkillName(skill) {
    return skill.name || skill.skill_name || skill.skill || "Competență";
  }

  function getCategoryColor(category) {
    const normalized = normalizeCategory(category);
    return CATEGORY_COLORS[normalized] || "#6b7280";
  }

  const mySkillIds = useMemo(() => {
    return new Set(mySkills.map((skill) => getSkillId(skill)));
  }, [mySkills]);

  const availableSkills = useMemo(() => {
    return allSkills.filter((skill) => !mySkillIds.has(Number(skill.id)));
  }, [allSkills, mySkillIds]);

  const categories = useMemo(() => {
    const values = new Set();

    mySkills.forEach((skill) => {
      values.add(normalizeCategory(skill.category));
    });

    return Array.from(values).sort((a, b) => a.localeCompare(b, "ro"));
  }, [mySkills]);

  const filteredMySkills = useMemo(() => {
    const query = search.trim().toLowerCase();

    return mySkills.filter((skill) => {
      const name = getSkillName(skill).toLowerCase();
      const category = normalizeCategory(skill.category);
      const level = String(getSkillLevel(skill));

      const matchesSearch =
        !query ||
        name.includes(query) ||
        category.toLowerCase().includes(query);

      const matchesCategory =
        categoryFilter === "ALL" || category === categoryFilter;

      const matchesLevel = levelFilter === "ALL" || level === levelFilter;

      return matchesSearch && matchesCategory && matchesLevel;
    });
  }, [mySkills, search, categoryFilter, levelFilter]);

  const groupedMySkills = useMemo(() => {
    const groups = {};

    for (const skill of filteredMySkills) {
      const category = normalizeCategory(skill.category);

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(skill);
    }

    return Object.entries(groups).sort((a, b) =>
      a[0].localeCompare(b[0], "ro")
    );
  }, [filteredMySkills]);

  const stats = useMemo(() => {
    return {
      total: mySkills.length,
      fundamental: mySkills.filter((skill) => getSkillLevel(skill) === 1)
        .length,
      intermediate: mySkills.filter((skill) => getSkillLevel(skill) === 2)
        .length,
      advanced: mySkills.filter((skill) => getSkillLevel(skill) === 3).length
    };
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
          level: Number(selectedLevel),
          confidence: 3
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

  async function handleUpdateSkillLevel(skillId, newLevel) {
    setMessage("");
    setError("");
    setLoadingUpdateId(skillId);

    try {
      await apiFetch(`/api/user-skills/${skillId}`, {
        method: "PATCH",
        body: JSON.stringify({
          level: Number(newLevel)
        })
      });

      setMySkills((prev) =>
        prev.map((skill) =>
          getSkillId(skill) === Number(skillId)
            ? {
                ...skill,
                level: Number(newLevel),
                current_level: Number(newLevel)
              }
            : skill
        )
      );

      setMessage("Nivelul competenței a fost actualizat.");
    } catch (err) {
      console.error("UPDATE SKILL LEVEL ERROR:", err);
      setError(err.message || "Nu s-a putut actualiza nivelul.");
    } finally {
      setLoadingUpdateId(null);
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

  function handleSelectCVFile(event) {
    const file = event.target.files?.[0] || null;

    setMessage("");
    setError("");
    setDetectedSkills([]);
    setCvFile(file);
  }

  function handleOpenFilePicker() {
    fileInputRef.current?.click();
  }

  function handleClearCVFile() {
    setCvFile(null);
    setDetectedSkills([]);
    setMessage("");
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
            level: Number(skill.level || 2),
            confidence: 3
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
    <AppLayout
      title="Competențele mele"
      subtitle="Gestionează competențele tale, nivelurile asociate și skillurile detectate din CV sau adăugate din roadmap."
    >
      <div style={styles.page}>
        <div style={styles.headerCard}>
          <div style={styles.headerTextWrap}>
            <div style={styles.eyebrow}>SkillTrack Profile</div>

            <h2 style={styles.headerTitle}>Profilul tău de competențe</h2>

            <p style={styles.headerSubtitle}>
              Monitorizează nivelurile curente, adaugă competențe noi și
              folosește CV-ul pentru detectare asistată.
            </p>
          </div>

          <div style={styles.statsPanel}>
            <div style={styles.mainStatCard}>
              <div>
                <div style={styles.mainStatLabel}>Competențe totale</div>
                <div style={styles.mainStatValue}>{stats.total}</div>
              </div>

              <div style={styles.mainStatText}>
                skilluri salvate în profilul tău
              </div>
            </div>

            <div style={styles.levelStatsRow}>
              <MiniStatCard value={stats.fundamental} label="Fundamental" />
              <MiniStatCard value={stats.intermediate} label="Intermediar" />
              <MiniStatCard value={stats.advanced} label="Avansat" />
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
                    {skill.category
                      ? ` — ${normalizeCategory(skill.category)}`
                      : ""}
                  </option>
                ))}
              </select>

              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                style={styles.select}
                disabled={loadingAdd}
              >
                {LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} — {LEVEL_DESCRIPTIONS[option.value]}
                  </option>
                ))}
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
              iar tu alegi ce vrei să adaugi în profil.
            </p>

            <div style={styles.uploadBox}>
              <input
                ref={fileInputRef}
                id="cv-upload-input"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleSelectCVFile}
                style={styles.hiddenFileInput}
                disabled={loadingCV || loadingApplyCV}
              />

              <button
                type="button"
                style={{
                  ...styles.uploadDropzone,
                  ...(cvFile ? styles.uploadDropzoneActive : {})
                }}
                onClick={handleOpenFilePicker}
                disabled={loadingCV || loadingApplyCV}
              >
                <div style={styles.uploadIcon}>📄</div>

                <div style={styles.uploadTextBlock}>
                  <strong>{cvFile ? "CV selectat" : "Încarcă CV"}</strong>
                  <span>
                    {cvFile
                      ? "Poți analiza fișierul sau îl poți înlocui."
                      : "PDF sau DOCX, folosit pentru detectarea competențelor."}
                  </span>
                </div>

                <div style={styles.uploadAction}>
                  {cvFile ? "Schimbă fișier" : "Selectează fișier"}
                </div>
              </button>

              {cvFile ? (
                <div style={styles.fileInfoRow}>
                  <div style={styles.fileBadge}>
                    <span style={styles.fileBadgeIcon}>✓</span>

                    <div style={styles.fileInfoText}>
                      <strong>{cvFile.name}</strong>
                      <span>{formatFileSize(cvFile.size)}</span>
                    </div>
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
                <div style={styles.uploadHint}>
                  Nu ai selectat încă niciun fișier.
                </div>
              )}

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
                              {skill.category
                                ? ` • ${normalizeCategory(skill.category)}`
                                : ""}
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
                                  {LEVEL_OPTIONS.map((option) => (
                                    <option
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </option>
                                  ))}
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
          <div style={styles.skillsDropdownHeader}>
            <div>
              <h2 style={styles.cardTitle}>Lista competențelor tale</h2>

              <p style={styles.cardText}>
                Caută, filtrează și actualizează nivelul competențelor din
                profilul tău.
              </p>
            </div>

            <div style={styles.skillsHeaderActions}>
              <span style={styles.skillsCountPill}>
                {filteredMySkills.length} / {mySkills.length} competențe
              </span>

              <button
                type="button"
                style={styles.dropdownToggleButton}
                onClick={() => setShowSkillsList((prev) => !prev)}
              >
                {showSkillsList ? "Ascunde lista" : "Deschide lista"}

                <span style={styles.dropdownArrow}>
                  {showSkillsList ? "↑" : "↓"}
                </span>
              </button>
            </div>
          </div>

          {showSkillsList && (
            <>
              <div style={styles.filtersCard}>
                <div style={styles.filterSearchGroup}>
                  <label style={styles.filterLabel}>Căutare</label>

                  <input
                    style={styles.searchInput}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Caută după nume sau categorie..."
                  />
                </div>

                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>Categorie</label>

                  <select
                    style={styles.filterSelect}
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                  >
                    <option value="ALL">Toate</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>Nivel</label>

                  <select
                    style={styles.filterSelect}
                    value={levelFilter}
                    onChange={(event) => setLevelFilter(event.target.value)}
                  >
                    <option value="ALL">Toate</option>
                    {LEVEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  style={styles.resetButton}
                  onClick={() => {
                    setSearch("");
                    setCategoryFilter("ALL");
                    setLevelFilter("ALL");
                  }}
                >
                  Resetează filtre
                </button>
              </div>

              {loadingPage ? (
                <div style={styles.emptyState}>Se încarcă competențele...</div>
              ) : mySkills.length === 0 ? (
                <div style={styles.emptyState}>
                  Nu ai încă nicio competență salvată. Adaugă una manual sau
                  analizează CV-ul pentru detectare asistată.
                </div>
              ) : filteredMySkills.length === 0 ? (
                <div style={styles.emptyState}>
                  Nu există competențe pentru filtrele curente.
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
                            {skills.length} {" "}
                            {skills.length === 1
                              ? "competență"
                              : "competențe"}
                          </span>
                        </div>

                        <div style={styles.skillList}>
                          {skills.map((skill) => {
                            const skillId = getSkillId(skill);
                            const level = getSkillLevel(skill);
                            const skillColor = getCategoryColor(
                              skill.category
                            );
                            const skillName = getSkillName(skill);

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
                                      <div style={styles.skillName}>
                                        {skillName}
                                      </div>

                                      <div style={styles.skillMeta}>
                                        {normalizeCategory(skill.category)}
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

                                  <div style={styles.levelUpdateRow}>
                                    <label style={styles.inlineLabel}>
                                      Actualizează nivelul:
                                      <select
                                        value={String(level)}
                                        style={styles.levelSelect}
                                        disabled={loadingUpdateId === skillId}
                                        onChange={(event) =>
                                          handleUpdateSkillLevel(
                                            skillId,
                                            event.target.value
                                          )
                                        }
                                      >
                                        {LEVEL_OPTIONS.map((option) => (
                                          <option
                                            key={option.value}
                                            value={option.value}
                                          >
                                            {option.label}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteSkill(skillId, skillName)
                                  }
                                  style={{
                                    ...styles.deleteButton,
                                    opacity:
                                      loadingDeleteId === skillId ? 0.7 : 1
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
            </>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

function MiniStatCard({ value, label }) {
  return (
    <div style={styles.miniStatCard}>
      <div style={styles.miniStatValue}>{value}</div>
      <div style={styles.miniStatLabel}>{label}</div>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "24px"
  },

  headerCard: {
    background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
    border: "1px solid #e5e7eb",
    borderRadius: "24px",
    padding: "24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "24px",
    flexWrap: "wrap",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)"
  },

  headerTextWrap: {
    maxWidth: "780px",
    flex: 1
  },

  eyebrow: {
    fontSize: "11px",
    fontWeight: 900,
    color: "#4f46e5",
    textTransform: "uppercase",
    letterSpacing: "1.4px",
    marginBottom: "10px"
  },

  headerTitle: {
    margin: 0,
    fontSize: "32px",
    lineHeight: 1.1,
    fontWeight: 900,
    color: "#111827",
    letterSpacing: "-0.04em"
  },

  headerSubtitle: {
    margin: "12px 0 0 0",
    fontSize: "15px",
    color: "#4b5563",
    lineHeight: 1.6
  },

  statsPanel: {
    width: "430px",
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },

  mainStatCard: {
    background: "#111827",
    color: "#ffffff",
    borderRadius: "22px",
    padding: "22px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "18px",
    boxShadow: "0 14px 34px rgba(15, 23, 42, 0.18)"
  },

  mainStatLabel: {
    fontSize: "12px",
    fontWeight: 900,
    color: "#cbd5e1",
    textTransform: "uppercase",
    letterSpacing: "1.1px"
  },

  mainStatValue: {
    marginTop: "8px",
    fontSize: "46px",
    lineHeight: 1,
    fontWeight: 900,
    color: "#ffffff"
  },

  mainStatText: {
    maxWidth: "150px",
    fontSize: "13px",
    lineHeight: 1.45,
    color: "#cbd5e1",
    textAlign: "right"
  },

  levelStatsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "10px"
  },

  miniStatCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "14px 16px",
    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.05)"
  },

  miniStatValue: {
    fontSize: "24px",
    fontWeight: 900,
    color: "#111827",
    lineHeight: 1
  },

  miniStatLabel: {
    marginTop: "7px",
    fontSize: "12px",
    color: "#6b7280",
    fontWeight: 700
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
    fontWeight: 800,
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
    fontWeight: 800,
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

  hiddenFileInput: {
    display: "none"
  },

  uploadDropzone: {
    width: "100%",
    border: "1px dashed #bfdbfe",
    borderRadius: "18px",
    background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)",
    padding: "18px",
    display: "grid",
    gridTemplateColumns: "52px 1fr auto",
    alignItems: "center",
    gap: "14px",
    cursor: "pointer",
    textAlign: "left"
  },

  uploadDropzoneActive: {
    border: "1px solid #93c5fd",
    background: "linear-gradient(135deg, #dbeafe 0%, #ffffff 100%)"
  },

  uploadIcon: {
    width: "52px",
    height: "52px",
    borderRadius: "16px",
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
    boxShadow: "0 6px 16px rgba(37, 99, 235, 0.12)"
  },

  uploadTextBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    minWidth: 0
  },

  uploadAction: {
    padding: "9px 12px",
    borderRadius: "12px",
    background: "#111827",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: 800,
    whiteSpace: "nowrap"
  },

  uploadHint: {
    padding: "11px 12px",
    borderRadius: "12px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    color: "#64748b",
    fontSize: "13px"
  },

  fileInfoRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "12px",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#f9fafb"
  },

  fileBadge: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: 0
  },

  fileBadgeIcon: {
    width: "28px",
    height: "28px",
    borderRadius: "999px",
    background: "#dcfce7",
    color: "#166534",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    flexShrink: 0
  },

  fileInfoText: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    fontSize: "13px",
    color: "#374151",
    lineHeight: 1.4,
    wordBreak: "break-word",
    minWidth: 0
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

  skillsDropdownHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap"
  },

  skillsHeaderActions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap"
  },

  skillsCountPill: {
    padding: "9px 12px",
    borderRadius: "999px",
    background: "#eef2ff",
    color: "#4338ca",
    fontSize: "13px",
    fontWeight: 800,
    whiteSpace: "nowrap"
  },

  dropdownToggleButton: {
    border: "none",
    borderRadius: "14px",
    padding: "11px 14px",
    fontSize: "14px",
    fontWeight: 800,
    cursor: "pointer",
    background: "#111827",
    color: "#ffffff",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px"
  },

  dropdownArrow: {
    width: "22px",
    height: "22px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.14)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900
  },

  filtersCard: {
    display: "grid",
    gridTemplateColumns: "1.4fr 180px 180px auto",
    gap: "12px",
    alignItems: "end",
    marginTop: "18px",
    padding: "16px",
    borderRadius: "18px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb"
  },

  filterSearchGroup: {
    display: "grid",
    gap: "6px",
    minWidth: 0
  },

  filterGroup: {
    display: "grid",
    gap: "6px"
  },

  filterLabel: {
    fontSize: "11px",
    fontWeight: 800,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: "1px"
  },

  searchInput: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    padding: "11px 12px",
    background: "#ffffff",
    color: "#111827",
    outline: "none",
    fontSize: "14px"
  },

  filterSelect: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    padding: "11px 12px",
    background: "#ffffff",
    color: "#111827",
    fontWeight: 700,
    outline: "none",
    fontSize: "14px"
  },

  resetButton: {
    padding: "11px 14px",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#374151",
    cursor: "pointer",
    fontWeight: 800,
    whiteSpace: "nowrap",
    height: "42px"
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
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
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

  levelUpdateRow: {
    marginTop: "12px",
    paddingTop: "12px",
    borderTop: "1px solid #f1f5f9"
  },

  inlineLabel: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 800
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