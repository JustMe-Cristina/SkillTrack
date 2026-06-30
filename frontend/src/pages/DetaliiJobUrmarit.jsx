import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { apiFetch } from "../services/api";

const STATUS_OPTIONS = [
  { value: "SALVAT", label: "Salvat" },
  { value: "APLICAT", label: "Aplicat" },
  { value: "INTERVIU", label: "Interviu" },
  { value: "OFERTA", label: "Ofertă" },
  { value: "RESPINS", label: "Respins" },
  { value: "FARA_RASPUNS", label: "Fără răspuns" }
];

const STATUS_LABELS = {
  SALVAT: "Salvat",
  APLICAT: "Aplicat",
  INTERVIU: "Interviu",
  OFERTA: "Ofertă",
  RESPINS: "Respins",
  FARA_RASPUNS: "Fără răspuns"
};

const CATEGORY_LABELS = {
  DATA: "Data",
  BI: "Business Intelligence",
  BUSINESS: "Business",
  PM: "Project Management",
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  FULLSTACK: "Full Stack",
  QA: "QA",
  AI_ML: "AI / ML"
};

const WORK_MODE_LABELS = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "On-site"
};

const WORK_MODE_OPTIONS = [
  { value: "", label: "Nespecificat" },
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "ONSITE", label: "On-site" }
];

const EMPLOYMENT_LABELS = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  INTERNSHIP: "Internship"
};

const EMPLOYMENT_OPTIONS = [
  { value: "", label: "Nespecificat" },
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "INTERNSHIP", label: "Internship" }
];

const DEGREE_LABELS = {
  NONE: "Nespecificat",
  BACHELOR: "Licență",
  MASTER: "Master",
  PHD: "Doctorat"
};

const DEGREE_LEVEL_OPTIONS = [
  { value: "NONE", label: "Nespecificat" },
  { value: "BACHELOR", label: "Licență" },
  { value: "MASTER", label: "Master" },
  { value: "PHD", label: "Doctorat" }
];

function formatPercent(value) {
  if (value === null || value === undefined || value === "") return "-";

  const number = Number(value);

  if (!Number.isFinite(number)) return "-";

  return `${Math.round(number * 100)}%`;
}

function formatScore(value) {
  if (value === null || value === undefined || value === "") return "0%";

  const number = Number(value);

  if (!Number.isFinite(number)) return "0%";

  return `${number}%`;
}

function safeJsonArray(value) {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeSkills(value) {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function getSkillName(skill) {
  if (!skill) return "";

  if (typeof skill === "string") return skill;

  return skill.name || skill.skill || skill.skill_name || "";
}

function normalizeStatus(status) {
  if (status === "IN_PROCES") return "SALVAT";
  return status || "SALVAT";
}

function buildScoreExplanation(job) {
  const skills = normalizeSkills(job?.skills);
  const matchScore = Number(job?.match_score || 0);

  if (skills.length === 0) {
    return "Scorul este calculat pe baza competențelor detectate în descrierea jobului și a competențelor salvate în profilul tău.";
  }

  if (matchScore >= 75) {
    return "Scorul indică o potrivire ridicată între profilul tău și cerințele detectate în job.";
  }

  if (matchScore >= 45) {
    return "Scorul indică o potrivire parțială: ai deja unele competențe relevante, dar există și skilluri care pot fi dezvoltate.";
  }

  return "Scorul indică un gap mai mare între profilul tău curent și cerințele detectate în job.";
}

function buildMlLocalExplanation(job) {
  if (!job?.ml_predicted_category) {
    return "Acest job nu are încă o categorie ML salvată.";
  }

  const skills = normalizeSkills(job.skills);
  const skillNames = skills.map(getSkillName).filter(Boolean).slice(0, 5);

  if (skillNames.length > 0) {
    return `Categoria ${job.ml_predicted_category} este susținută de skillurile detectate în descriere, precum: ${skillNames.join(
      ", "
    )}.`;
  }

  return `Categoria ${job.ml_predicted_category} a fost estimată pe baza textului descrierii jobului și a atributelor extrase automat.`;
}

function getRequirementHelper(value) {
  if (value === null || value === undefined) return "neconfirmat";
  return Number(value) === 1 || value === true ? "îndeplinit" : "neîndeplinit";
}

function getDegreeLabel(jobOrLevel) {
  const level =
    typeof jobOrLevel === "string"
      ? jobOrLevel
      : jobOrLevel?.degree_level;

  if (level && DEGREE_LABELS[level]) {
    return DEGREE_LABELS[level];
  }

  if (typeof jobOrLevel === "object" && jobOrLevel?.degree_label) {
    return jobOrLevel.degree_label;
  }

  return "Nespecificat";
}

function buildEditForm(job) {
  return {
    title: job?.title || "",
    company: job?.company || "",
    location: job?.location || "",
    work_mode: job?.work_mode || "",
    employment_type: job?.employment_type || "",
    experience_min:
      job?.experience_min === null || job?.experience_min === undefined
        ? ""
        : String(job.experience_min),
    experience_label: job?.experience_label || "",
    degree_level: job?.degree_level || "NONE",
    description: job?.description || ""
  };
}

function cleanPayloadValue(value) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

export default function DetaliiJobUrmarit() {
  const params = useParams();
  const id = params.id || params.jobId;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isEditMode = searchParams.get("edit") === "1";

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [editForm, setEditForm] = useState(buildEditForm(null));
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchJob() {
    setLoading(true);
    setMessage("");
    setDescriptionExpanded(false);

    if (!id) {
      setMessage("ID job invalid.");
      setJob(null);
      setLoading(false);
      return;
    }

    try {
      const data = await apiFetch(`/api/jobs/${id}`);
      const loadedJob = data.job || null;
      setJob(loadedJob);
      setEditForm(buildEditForm(loadedJob));
    } catch (err) {
      console.error("GET JOB DETAILS ERROR:", err);
      setMessage(err.message || "Nu s-au putut încărca detaliile jobului.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(event) {
    const newStatus = event.target.value;

    if (!job) return;

    setUpdatingStatus(true);
    setMessage("");

    try {
      await apiFetch(`/api/jobs/${job.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: newStatus
        })
      });

      setJob((prev) => ({
        ...prev,
        status: newStatus
      }));

      setMessage("Statusul jobului a fost actualizat.");
    } catch (err) {
      console.error("UPDATE STATUS ERROR:", err);
      setMessage(err.message || "Nu s-a putut actualiza statusul.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleGenerateRoadmap() {
    if (!job) return;

    setGeneratingRoadmap(true);
    setMessage("");

    try {
      const data = await apiFetch(`/api/roadmaps/generate/${job.id}`, {
        method: "POST"
      });

      setMessage("Roadmap generat cu succes.");

      const roadmapId = data.roadmapId || data.id;

      if (roadmapId) {
        navigate("/roadmaps");
      }
    } catch (err) {
      console.error("GENERATE ROADMAP FROM JOB DETAILS ERROR:", err);

      if (err.message?.includes("Există deja")) {
        setMessage(
          "Există deja un roadmap pentru acest job. Te trimit la Planuri de dezvoltare."
        );
        navigate("/roadmaps");
      } else {
        setMessage(err.message || "Nu s-a putut genera roadmap-ul.");
      }
    } finally {
      setGeneratingRoadmap(false);
    }
  }

  function handleEditChange(field, value) {
    setEditForm((prev) => ({
      ...prev,
      [field]: value
    }));
  }

  function handleCancelEdit() {
    setEditForm(buildEditForm(job));
    setSearchParams({});
    setMessage("");
  }

  async function handleSaveEdit(event) {
    event.preventDefault();

    if (!job) return;

    const payload = {
      title: cleanPayloadValue(editForm.title),
      company: cleanPayloadValue(editForm.company),
      location: cleanPayloadValue(editForm.location),
      work_mode: editForm.work_mode || null,
      employment_type: editForm.employment_type || null,
      experience_min:
        editForm.experience_min === "" || editForm.experience_min === null
          ? null
          : Number(editForm.experience_min),
      experience_label: cleanPayloadValue(editForm.experience_label),
      degree_level: editForm.degree_level || "NONE",
      degree_label: getDegreeLabel(editForm.degree_level || "NONE"),
      description: cleanPayloadValue(editForm.description)
    };

    if (!payload.title || !payload.description) {
      setMessage("Titlul și descrierea jobului sunt obligatorii.");
      return;
    }

    if (
      payload.experience_min !== null &&
      (!Number.isFinite(payload.experience_min) || payload.experience_min < 0)
    ) {
      setMessage("Experiența minimă trebuie să fie un număr valid.");
      return;
    }

    setSavingEdit(true);
    setMessage("");

    try {
      const data = await apiFetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });

      const updatedJob = data.job || {
        ...job,
        ...payload
      };

      setJob(updatedJob);
      setEditForm(buildEditForm(updatedJob));
      setSearchParams({});
      setMessage("Jobul a fost actualizat cu succes.");
    } catch (err) {
      console.error("UPDATE JOB DETAILS ERROR:", err);
      setMessage(err.message || "Nu s-au putut salva modificările jobului.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete() {
    if (!job) return;

    const confirmed = window.confirm(
      "Sigur vrei să ștergi acest job din lista de joburi urmărite?"
    );

    if (!confirmed) return;

    setDeleting(true);
    setMessage("");

    try {
      await apiFetch(`/api/jobs/${job.id}`, {
        method: "DELETE"
      });

      navigate("/joburi-urmarite");
    } catch (err) {
      console.error("DELETE JOB ERROR:", err);
      setMessage(err.message || "Nu s-a putut șterge jobul.");
    } finally {
      setDeleting(false);
    }
  }

  const normalizedSkills = useMemo(() => {
    return normalizeSkills(job?.skills);
  }, [job]);

  const mlProbabilities = useMemo(() => {
    if (!job) return [];

    const source = job.ml_probabilities || job.ml_probabilities_json;
    return safeJsonArray(source);
  }, [job]);

  const topMlProbability = useMemo(() => {
    if (!mlProbabilities.length) return null;

    return [...mlProbabilities].sort(
      (a, b) => Number(b.probability || 0) - Number(a.probability || 0)
    )[0];
  }, [mlProbabilities]);

  const skillsByCategory = useMemo(() => {
    const grouped = {};

    normalizedSkills.forEach((skill) => {
      const category = skill.category || "Altele";

      if (!grouped[category]) {
        grouped[category] = [];
      }

      grouped[category].push(skill);
    });

    return grouped;
  }, [normalizedSkills]);

  if (loading) {
    return (
      <AppLayout
        title="Detalii job urmărit"
        subtitle="Se încarcă informațiile jobului..."
      >
        <div style={styles.card}>
          <div style={styles.muted}>Se încarcă...</div>
        </div>
      </AppLayout>
    );
  }

  if (!job) {
    return (
      <AppLayout
        title="Detalii job urmărit"
        subtitle="Jobul nu a fost găsit."
      >
        {message && <div style={styles.message}>{message}</div>}

        <div style={styles.card}>
          <p style={styles.muted}>Nu există date pentru acest job.</p>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => navigate("/joburi-urmarite")}
          >
            Înapoi la joburi urmărite
          </button>
        </div>
      </AppLayout>
    );
  }

  const normalizedStatus = normalizeStatus(job.status);

  return (
    <AppLayout
      title="Detalii job urmărit"
      subtitle="Vezi analiza completă, scorul de potrivire și predicția ML salvată."
    >
      {message && <div style={styles.message}>{message}</div>}

      <div style={styles.headerActions}>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => navigate("/joburi-urmarite")}
        >
          Înapoi la joburi
        </button>

        <div style={styles.headerButtons}>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => navigate("/analytics")}
          >
            Vezi analytics
          </button>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => {
              if (isEditMode) {
                handleCancelEdit();
              } else {
                setSearchParams({ edit: "1" });
              }
            }}
          >
            {isEditMode ? "Renunță la editare" : "Editează"}
          </button>

          <button
            type="button"
            style={styles.primaryButton}
            onClick={handleGenerateRoadmap}
            disabled={generatingRoadmap}
          >
            {generatingRoadmap ? "Se generează..." : "Generează roadmap"}
          </button>

          <button
            type="button"
            style={styles.dangerButton}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Se șterge..." : "Șterge jobul"}
          </button>
        </div>
      </div>

      {isEditMode && (
        <form style={styles.editCard} onSubmit={handleSaveEdit}>
          <div style={styles.sectionLabel}>Editare job</div>
          <h2 style={styles.sectionTitle}>Modifică informațiile salvate</h2>
          <p style={styles.editHelper}>
            Modificările se salvează în baza de date pentru acest job urmărit. Scorul și skillurile detectate rămân cele calculate la analiza inițială.
          </p>

          <div style={styles.formGridTwo}>
            <label style={styles.formGroup}>
              Titlu job
              <input
                style={styles.input}
                value={editForm.title}
                onChange={(event) => handleEditChange("title", event.target.value)}
                placeholder="Ex: Graduate Software Engineer"
              />
            </label>

            <label style={styles.formGroup}>
              Companie
              <input
                style={styles.input}
                value={editForm.company}
                onChange={(event) => handleEditChange("company", event.target.value)}
                placeholder="Ex: Bending Spoons"
              />
            </label>
          </div>

          <div style={styles.formGridThree}>
            <label style={styles.formGroup}>
              Locație
              <input
                style={styles.input}
                value={editForm.location}
                onChange={(event) => handleEditChange("location", event.target.value)}
                placeholder="Ex: Cluj-Napoca"
              />
            </label>

            <label style={styles.formGroup}>
              Mod de lucru
              <select
                style={styles.input}
                value={editForm.work_mode}
                onChange={(event) => handleEditChange("work_mode", event.target.value)}
              >
                {WORK_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={styles.formGroup}>
              Tip angajare
              <select
                style={styles.input}
                value={editForm.employment_type}
                onChange={(event) => handleEditChange("employment_type", event.target.value)}
              >
                {EMPLOYMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={styles.formGridThree}>
            <label style={styles.formGroup}>
              Experiență minimă ani
              <input
                style={styles.input}
                type="number"
                min="0"
                step="1"
                value={editForm.experience_min}
                onChange={(event) => handleEditChange("experience_min", event.target.value)}
                placeholder="Ex: 0"
              />
            </label>

            <label style={styles.formGroup}>
              Etichetă experiență
              <input
                style={styles.input}
                value={editForm.experience_label}
                onChange={(event) => handleEditChange("experience_label", event.target.value)}
                placeholder="Ex: Entry-level / Graduate"
              />
            </label>

            <label style={styles.formGroup}>
              Nivel studii
              <select
                style={styles.input}
                value={editForm.degree_level}
                onChange={(event) => handleEditChange("degree_level", event.target.value)}
              >
                {DEGREE_LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label style={styles.formGroup}>
            Descriere job
            <textarea
              style={styles.textarea}
              value={editForm.description}
              onChange={(event) => handleEditChange("description", event.target.value)}
              placeholder="Textul jobului salvat"
            />
          </label>

          <div style={styles.editActions}>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={handleCancelEdit}
              disabled={savingEdit}
            >
              Anulează
            </button>

            <button
              type="submit"
              style={styles.primaryButton}
              disabled={savingEdit}
            >
              {savingEdit ? "Se salvează..." : "Salvează modificările"}
            </button>
          </div>
        </form>
      )}

      <div style={styles.heroCard}>
        <div>
          <div style={styles.eyebrow}>Job urmărit</div>
          <h1 style={styles.heroTitle}>{job.title}</h1>

          <p style={styles.heroMeta}>
            {job.company || "Companie necunoscută"} ·{" "}
            {job.location || "Locație nespecificată"}
          </p>
        </div>

        <div style={styles.scorePanel}>
          <span>Scor potrivire </span>
          <strong>{formatScore(job.match_score)}</strong>
          <p>{buildScoreExplanation(job)}</p>
        </div>
      </div>

      <div style={styles.gridThree}>
        <InfoCard
          label="Mod de lucru"
          value={WORK_MODE_LABELS[job.work_mode] || job.work_mode || "-"}
        />

        <InfoCard
          label="Tip angajare"
          value={
            EMPLOYMENT_LABELS[job.employment_type] ||
            job.employment_type ||
            "Nespecificat"
          }
        />

        <InfoCard
          label="Categorie"
          value={
            CATEGORY_LABELS[job.ml_predicted_category] ||
            job.ml_predicted_category ||
            "N/A"
          }
        />
      </div>

      <div style={styles.gridThree}>
        <InfoCard
          label="Experiență cerută"
          value={job.experience_label || "-"}
          helper={getRequirementHelper(job.meets_experience_requirement)}
        />

        <InfoCard
          label="Studii cerute"
          value={getDegreeLabel(job)}
          helper={getRequirementHelper(job.meets_degree_requirement)}
        />

        <div style={styles.infoCard}>
          <div style={styles.infoLabel}>Status</div>

          <select
            value={normalizedStatus}
            onChange={handleStatusChange}
            disabled={updatingStatus}
            style={styles.statusSelect}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div style={styles.infoHelper}>
            {updatingStatus
              ? "Se actualizează..."
              : `Status curent: ${STATUS_LABELS[normalizedStatus] || "Salvat"}`}
          </div>
        </div>
      </div>

      <div style={styles.explanationCard}>
        <div style={styles.sectionLabel}>Explicație scor</div>
        <h2 style={styles.sectionTitle}>Cum se interpretează potrivirea?</h2>
        <p style={styles.description}>
          Scorul compară competențele detectate în descrierea jobului cu
          competențele salvate în profilul tău. Skillurile asociate jobului sunt
          afișate mai jos, grupate pe categorii. Un scor mediu indică faptul că
          ai deja o parte dintre cerințe, dar există competențe care pot fi
          dezvoltate prin roadmap.
        </p>
      </div>

      <div style={styles.mainGrid}>
        <div style={styles.leftColumn}>
          <section style={styles.descriptionCard}>
            <div style={styles.descriptionHeader}>
              <div>
                <div style={styles.sectionLabel}>Descriere job</div>
                <h2 style={styles.sectionTitle}>Textul jobului analizat</h2>
              </div>

              <button
                type="button"
                style={styles.expandButton}
                onClick={() => setDescriptionExpanded((prev) => !prev)}
                aria-label={
                  descriptionExpanded
                    ? "Restrânge descrierea jobului"
                    : "Extinde descrierea jobului"
                }
                title={
                  descriptionExpanded
                    ? "Restrânge descrierea"
                    : "Vezi descrierea completă"
                }
              >
                {descriptionExpanded ? "↑" : "↓"}
              </button>
            </div>

            <div
              style={{
                ...styles.descriptionContent,
                ...(descriptionExpanded ? styles.descriptionContentExpanded : {})
              }}
            >
              <p style={styles.description}>{job.description}</p>
            </div>

            {!descriptionExpanded && (
              <button
                type="button"
                style={styles.readMoreButton}
                onClick={() => setDescriptionExpanded(true)}
              >
                Vezi descrierea completă
              </button>
            )}
          </section>

          <section style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <div style={styles.sectionLabel}>Competențe detectate</div>
                <h2 style={styles.sectionTitle}>Skilluri asociate jobului</h2>
              </div>
            </div>

            {normalizedSkills.length > 0 ? (
              <div style={styles.skillGroups}>
                {Object.entries(skillsByCategory).map(([category, skills]) => (
                  <div key={category} style={styles.skillGroup}>
                    <h3 style={styles.skillCategory}>{category}</h3>

                    <div style={styles.skillTags}>
                      {skills.map((skill, index) => {
                        const skillName = getSkillName(skill);

                        return (
                          <span
                            key={skill.id || skill.skillId || skillName || index}
                            style={styles.skillTag}
                          >
                            {skillName || "Skill"}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="Nu există skilluri asociate acestui job." />
            )}
          </section>
        </div>

        <div style={styles.rightColumn}>
          <section style={styles.mlCard}>
            <div style={styles.mlHeader}>
              <div>
                <div style={styles.mlLabel}>Machine Learning</div>
                <h2 style={styles.mlTitle}>Clasificare automată job</h2>
              </div>

              <div style={styles.mlBadge}>
                {job.ml_predicted_category || "N/A"}
              </div>
            </div>

            {job.ml_predicted_category ? (
              <>
                <p style={styles.mlText}>
                  Modelul <strong>{job.ml_model || "ML"}</strong> a estimat că
                  acest job aparține categoriei{" "}
                  <strong>
                    {CATEGORY_LABELS[job.ml_predicted_category] ||
                      job.ml_predicted_category}
                  </strong>
                  .
                </p>

                <div style={styles.xaiBox}>
                  <div style={styles.xaiLabel}>Explicație locală</div>
                  <p>{buildMlLocalExplanation(job)}</p>
                </div>

                <div style={styles.mlMetaGrid}>
                  <div style={styles.mlMetaCard}>
                    <span>Model</span>
                    <strong>{job.ml_model || "-"}</strong>
                  </div>

                  <div style={styles.mlMetaCard}>
                    <span>Confidence</span>
                    <strong>{formatPercent(job.ml_confidence)}</strong>
                  </div>

                  <div style={styles.mlMetaCard}>
                    <span>Problemă</span>
                    <strong>multiclass</strong>
                  </div>
                </div>

                {mlProbabilities.length > 0 && (
                  <div style={styles.probabilityList}>
                    {mlProbabilities.slice(0, 6).map((item, index) => {
                      const percent = Math.round(
                        Number(item.probability || 0) * 100
                      );

                      return (
                        <div
                          key={item.category || index}
                          style={styles.probabilityRow}
                        >
                          <span>{item.category || "N/A"}</span>

                          <div style={styles.probabilityBar}>
                            <div
                              style={{
                                ...styles.probabilityFill,
                                width: `${percent}%`
                              }}
                            />
                          </div>

                          <strong>{percent}%</strong>
                        </div>
                      );
                    })}
                  </div>
                )}

                <p style={styles.mlNote}>
                  Probabilitățile sunt scoruri relative generate de model, nu
                  certitudini absolute. Ele ajută la interpretarea apartenenței
                  jobului la diferite categorii.
                </p>

                {topMlProbability && (
                  <div style={styles.mlInterpretation}>
                    Categoria cu scorul relativ cel mai mare este{" "}
                    <strong>{topMlProbability.category}</strong>, cu{" "}
                    <strong>{formatPercent(topMlProbability.probability)}</strong>.
                  </div>
                )}
              </>
            ) : (
              <EmptyState message="Acest job nu are încă predicție ML salvată." />
            )}
          </section>

          <section style={styles.card}>
            <div style={styles.sectionLabel}>Acțiuni rapide</div>

            <div style={styles.actionList}>
              <button
                type="button"
                style={styles.actionButton}
                onClick={() => navigate("/analiza-job")}
              >
                Analizează alt job
              </button>

              <button
                type="button"
                style={styles.actionButton}
                onClick={handleGenerateRoadmap}
                disabled={generatingRoadmap}
              >
                {generatingRoadmap ? "Se generează..." : "Generează roadmap"}
              </button>

              <button
                type="button"
                style={styles.actionButton}
                onClick={() => navigate("/roadmaps")}
              >
                Vezi planurile mele de dezvoltare
              </button>

              <button
                type="button"
                style={styles.actionButton}
                onClick={() => navigate("/competentele-mele")}
              >
                Actualizează skillurile
              </button>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

function InfoCard({ label, value, helper }) {
  return (
    <div style={styles.infoCard}>
      <div style={styles.infoLabel}>{label}</div>
      <div style={styles.infoValue}>{value}</div>
      {helper ? <div style={styles.infoHelper}>{helper}</div> : null}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div style={styles.emptyState}>
      <span>{message}</span>
    </div>
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

  muted: {
    color: "#9ca3af",
    fontSize: 14
  },

  headerActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 16
  },

  headerButtons: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap"
  },

  heroCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "stretch",
    gap: 24,
    marginBottom: 16,
    padding: 24,
    borderRadius: 20,
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(239,246,255,0.98))",
    border: "1px solid #e0e7ff",
    boxShadow: "0 16px 45px rgba(15,23,42,0.08)"
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: 800,
    color: "#4f46e5",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 8
  },

  heroTitle: {
    margin: 0,
    fontSize: 34,
    color: "#111827",
    letterSpacing: "-0.04em"
  },

  heroMeta: {
    margin: "10px 0 0",
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.7
  },

  scorePanel: {
    minWidth: 280,
    maxWidth: 380,
    borderRadius: 18,
    background: "#111827",
    color: "white",
    padding: 20
  },

  gridThree: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 14,
    marginBottom: 16
  },

  explanationCard: {
    background: "#ffffff",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
    border: "1px solid #e5e7eb",
    marginBottom: 16
  },

  mainGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 420px",
    gap: 16,
    alignItems: "start"
  },

  leftColumn: {
    display: "grid",
    gap: 16
  },

  rightColumn: {
    display: "grid",
    gap: 16
  },

  card: {
    background: "white",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
    border: "1px solid #f1f5f9"
  },

  descriptionCard: {
    background: "white",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
    border: "1px solid #f1f5f9"
  },

  descriptionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 14
  },

  expandButton: {
    width: 38,
    height: 38,
    borderRadius: "999px",
    border: "1px solid #dbeafe",
    background: "#eff6ff",
    color: "#1d4ed8",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },

  descriptionContent: {
    maxHeight: 260,
    overflow: "hidden",
    position: "relative"
  },

  descriptionContentExpanded: {
    maxHeight: "none",
    overflow: "visible"
  },

  readMoreButton: {
    marginTop: 14,
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #dbeafe",
    background: "#eff6ff",
    color: "#1d4ed8",
    cursor: "pointer",
    fontWeight: 800
  },

  infoCard: {
    background: "white",
    borderRadius: 16,
    padding: 18,
    boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
    border: "1px solid #f1f5f9"
  },

  infoLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8
  },

  infoValue: {
    color: "#111827",
    fontWeight: 800,
    fontSize: 18
  },

  infoHelper: {
    marginTop: 6,
    fontSize: 12,
    color: "#64748b"
  },

  statusSelect: {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    padding: "10px 12px",
    background: "#ffffff",
    color: "#111827",
    fontWeight: 700,
    outline: "none"
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 16
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8
  },

  sectionTitle: {
    margin: 0,
    color: "#111827",
    fontSize: 20,
    letterSpacing: "-0.02em"
  },

  description: {
    margin: 0,
    whiteSpace: "pre-wrap",
    color: "#475569",
    lineHeight: 1.75,
    fontSize: 14
  },

  skillGroups: {
    display: "grid",
    gap: 16
  },

  skillGroup: {
    padding: 14,
    borderRadius: 14,
    background: "#f8fafc",
    border: "1px solid #e5e7eb"
  },

  skillCategory: {
    margin: "0 0 10px",
    color: "#111827",
    fontSize: 15
  },

  skillTags: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8
  },

  skillTag: {
    padding: "7px 10px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#3730a3",
    fontWeight: 700,
    fontSize: 13
  },

  mlCard: {
    padding: 20,
    borderRadius: 16,
    background: "#ffffff",
    border: "1px solid #e0e7ff",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)"
  },

  mlHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 12
  },

  mlLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: "#4f46e5",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6
  },

  mlTitle: {
    margin: 0,
    fontSize: 18,
    color: "#111827"
  },

  mlBadge: {
    padding: "10px 14px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#3730a3",
    fontWeight: 900,
    fontSize: 14
  },

  mlText: {
    margin: "0 0 14px",
    color: "#475569",
    lineHeight: 1.65,
    fontSize: 14
  },

  xaiBox: {
    padding: 14,
    borderRadius: 14,
    background: "#eef2ff",
    border: "1px solid #c7d2fe",
    color: "#3730a3",
    fontSize: 13,
    lineHeight: 1.6,
    marginBottom: 16
  },

  xaiLabel: {
    fontSize: 11,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 6
  },

  mlMetaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
    marginBottom: 16
  },

  mlMetaCard: {
    padding: 12,
    borderRadius: 12,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 12
  },

  probabilityList: {
    display: "grid",
    gap: 10,
    marginTop: 12
  },

  probabilityRow: {
    display: "grid",
    gridTemplateColumns: "90px 1fr 48px",
    alignItems: "center",
    gap: 10,
    fontSize: 13,
    color: "#475569"
  },

  probabilityBar: {
    height: 9,
    borderRadius: 999,
    background: "#e5e7eb",
    overflow: "hidden"
  },

  probabilityFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #378ADD, #1D9E75)"
  },

  mlNote: {
    margin: "14px 0 0",
    padding: 12,
    borderRadius: 12,
    background: "#f8fafc",
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.55
  },

  mlInterpretation: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    background: "#ecfdf5",
    color: "#166534",
    fontSize: 13,
    lineHeight: 1.55
  },

  actionList: {
    display: "grid",
    gap: 10
  },

  actionButton: {
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 700,
    textAlign: "left"
  },

  editCard: {
    background: "#ffffff",
    borderRadius: 18,
    padding: 20,
    border: "1px solid #dbeafe",
    boxShadow: "0 16px 45px rgba(15,23,42,0.08)",
    marginBottom: 16
  },

  editHelper: {
    margin: "8px 0 16px",
    color: "#64748b",
    lineHeight: 1.6,
    fontSize: 13
  },

  formGridTwo: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 12
  },

  formGridThree: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 12
  },

  formGroup: {
    display: "grid",
    gap: 7,
    color: "#475569",
    fontSize: 12,
    fontWeight: 800
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d1d5db",
    borderRadius: 12,
    padding: "11px 12px",
    background: "#ffffff",
    color: "#111827",
    outline: "none",
    fontSize: 14,
    fontWeight: 600
  },

  textarea: {
    width: "100%",
    minHeight: 220,
    boxSizing: "border-box",
    border: "1px solid #d1d5db",
    borderRadius: 12,
    padding: "12px",
    background: "#ffffff",
    color: "#111827",
    outline: "none",
    fontSize: 14,
    lineHeight: 1.6,
    resize: "vertical"
  },

  editActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
    flexWrap: "wrap"
  },

  primaryButton: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700
  },

  secondaryButton: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 700
  },

  dangerButton: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: "#dc2626",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700
  },

  emptyState: {
    minHeight: 120,
    borderRadius: 14,
    background: "#f8fafc",
    border: "1px dashed #cbd5e1",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 18,
    fontSize: 13
  }
};