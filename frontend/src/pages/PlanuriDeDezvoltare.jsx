import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";
import { apiFetch } from "../services/api";
import MesajFeedback from "../components/MesajFeedback";

const STATUS_LABELS = {
  NOT_STARTED: "Neînceput",
  IN_PROGRESS: "În progres",
  COMPLETED: "Finalizat",
};

const STEP_STATUS_OPTIONS = [
  { value: "NOT_STARTED", label: "Neînceput" },
  { value: "IN_PROGRESS", label: "În progres" },
  { value: "COMPLETED", label: "Finalizat" },
];

function formatDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function normalizeJobs(data) {
  if (Array.isArray(data?.jobs)) return data.jobs;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
}

function normalizeRoadmaps(data) {
  if (Array.isArray(data?.roadmaps)) return data.roadmaps;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
}

function normalizeUserSkills(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.skills)) return data.skills;
  if (Array.isArray(data?.userSkills)) return data.userSkills;
  return [];
}

function getUserSkillId(skill) {
  return Number(skill.skillId ?? skill.skill_id ?? skill.id);
}

function getStepMeta(step) {
  const title = String(step.title || "").toLowerCase();
  const skillName = step.skill_name || "Skill general";

  if (title.includes("înțelege") || title.includes("intelege")) {
    return `${skillName} · Etapă conceptuală`;
  }

  if (title.includes("exersează") || title.includes("exerseaza")) {
    return `${skillName} · Etapă practică`;
  }

  if (
    title.includes("validează") ||
    title.includes("valideaza") ||
    title.includes("validare")
  ) {
    return `${skillName} · Validare competență`;
  }

  return `${skillName} · Etapă de dezvoltare`;
}

function isValidationStep(step) {
  const title = String(step.title || "").toLowerCase();

  return (
    title.includes("validează") ||
    title.includes("valideaza") ||
    title.includes("validare")
  );
}

function getVisibleSteps(roadmap, profileSkillIds) {
  if (!roadmap?.steps?.length) return [];

  return roadmap.steps.filter((step) => {
    const isAddedToProfile =
      step.skill_id && profileSkillIds.has(Number(step.skill_id));

    return !(
      step.status === "COMPLETED" &&
      isValidationStep(step) &&
      isAddedToProfile
    );
  });
}

function getNextStep(roadmap, profileSkillIds) {
  const visibleSteps = getVisibleSteps(roadmap, profileSkillIds);

  return (
    visibleSteps.find((step) => step.status === "IN_PROGRESS") ||
    visibleSteps.find((step) => step.status === "NOT_STARTED") ||
    visibleSteps[0] ||
    null
  );
}

function getRoadmapStatusText(roadmap) {
  if (!roadmap) return "-";

  if (Number(roadmap.progress || 0) === 100 || roadmap.status === "COMPLETED") {
    return "Finalizat";
  }

  if (Number(roadmap.progress || 0) > 0 || roadmap.status === "IN_PROGRESS") {
    return "În progres";
  }

  return "Neînceput";
}

function getScoreTone(score) {
  const value = Number(score || 0);

  if (value >= 75) {
    return {
      background: "#dcfce7",
      color: "#166534",
      border: "1px solid #bbf7d0",
    };
  }

  if (value >= 45) {
    return {
      background: "#fef3c7",
      color: "#92400e",
      border: "1px solid #fde68a",
    };
  }

  return {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
  };
}

function getPreviewStatusStyle(status) {
  if (status === "Finalizat") return styles.previewStatusCompleted;
  if (status === "În progres") return styles.previewStatusInProgress;
  return styles.previewStatusNotStarted;
}

export default function PlanuriDeDezvoltare() {
  const [jobs, setJobs] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);

  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedRoadmapId, setSelectedRoadmapId] = useState("");
  const [selectedRoadmap, setSelectedRoadmap] = useState(null);

  const [showSavedJobs, setShowSavedJobs] = useState(false);
  const [showRoadmapList, setShowRoadmapList] = useState(false);
  const [showPlanSteps, setShowPlanSteps] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [generatingJobId, setGeneratingJobId] = useState(null);
  const [updatingStepId, setUpdatingStepId] = useState(null);
  const [deletingRoadmap, setDeletingRoadmap] = useState(false);
  const [message, setMessage] = useState("");

  const [completionPopup, setCompletionPopup] = useState(false);
  const [completedSkillPrompt, setCompletedSkillPrompt] = useState(null);
  const [addingSkillId, setAddingSkillId] = useState(null);
  const [profileSkillIds, setProfileSkillIds] = useState(new Set());

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedRoadmapId) {
      loadRoadmapDetails(selectedRoadmapId);
    } else {
      setSelectedRoadmap(null);
    }
  }, [selectedRoadmapId]);

  async function loadInitialData() {
    setLoading(true);
    setMessage("");

    try {
      const [jobsData, roadmapsData, userSkillsData] = await Promise.all([
        apiFetch("/api/jobs"),
        apiFetch("/api/roadmaps"),
        apiFetch("/api/user-skills"),
      ]);

      const normalizedJobs = normalizeJobs(jobsData);
      const normalizedRoadmaps = normalizeRoadmaps(roadmapsData);
      const normalizedUserSkills = normalizeUserSkills(userSkillsData);

      setJobs(normalizedJobs);
      setRoadmaps(normalizedRoadmaps);

      setProfileSkillIds(
        new Set(
          normalizedUserSkills
            .map((skill) => getUserSkillId(skill))
            .filter((id) => Number.isFinite(id)),
        ),
      );

      if (normalizedJobs.length > 0 && !selectedJobId) {
        setSelectedJobId(String(normalizedJobs[0].id));
      }

      if (normalizedRoadmaps.length > 0 && !selectedRoadmapId) {
        setSelectedRoadmapId(String(normalizedRoadmaps[0].id));
      }
    } catch (err) {
      console.error("LOAD ROADMAPS ERROR:", err);
      setMessage(
        err.message || "Nu s-au putut încărca planurile de dezvoltare.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadRoadmapDetails(roadmapId) {
    setLoadingDetails(true);
    setMessage("");

    try {
      const data = await apiFetch(`/api/roadmaps/${roadmapId}`);
      setSelectedRoadmap(data.roadmap || null);
    } catch (err) {
      console.error("LOAD ROADMAP DETAILS ERROR:", err);
      setMessage(
        err.message || "Nu s-au putut încărca detaliile roadmap-ului.",
      );
    } finally {
      setLoadingDetails(false);
    }
  }

  async function handleGenerateRoadmap(jobIdOverride = null) {
    const jobIdToUse = jobIdOverride || selectedJobId;

    if (!jobIdToUse) {
      setMessage("Alege un job pentru care să generezi learning plan.");
      return;
    }

    setGeneratingJobId(jobIdToUse);
    setMessage("");

    try {
      const data = await apiFetch(`/api/roadmaps/generate/${jobIdToUse}`, {
        method: "POST",
      });

      await loadInitialData();

      const newRoadmapId = data.roadmapId || data.id;

      if (newRoadmapId) {
        setSelectedRoadmapId(String(newRoadmapId));
        setShowPlanSteps(true);
      }

      setShowSavedJobs(false);
      setShowRoadmapList(false);
      setMessage("Learning plan generat cu succes.");
    } catch (err) {
      console.error("GENERATE ROADMAP ERROR:", err);

      if (err.message?.includes("Există deja")) {
        setMessage(
          "Există deja un learning plan pentru acest job. Deschide lista de roadmap-uri și selectează-l.",
        );
        setShowRoadmapList(true);
      } else {
        setMessage(err.message || "Nu s-a putut genera learning plan-ul.");
      }
    } finally {
      setGeneratingJobId(null);
    }
  }

  async function handleStepStatusChange(stepId, status) {
    setUpdatingStepId(stepId);
    setMessage("");

    try {
      const completedStep = selectedRoadmap?.steps?.find(
        (step) => step.id === stepId,
      );

      const data = await apiFetch(`/api/roadmaps/steps/${stepId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setSelectedRoadmap((prev) => {
        if (!prev) return prev;

        const updatedSteps = prev.steps.map((step) =>
          step.id === stepId ? { ...step, status } : step,
        );

        return {
          ...prev,
          steps: updatedSteps,
          progress: data.progress,
          status: data.roadmapStatus,
        };
      });

      setRoadmaps((prev) =>
        prev.map((roadmap) =>
          roadmap.id === data.roadmapId
            ? {
                ...roadmap,
                progress: data.progress,
                status: data.roadmapStatus,
              }
            : roadmap,
        ),
      );

      if (status === "COMPLETED") {
        if (completedStep?.skill_id && isValidationStep(completedStep)) {
          setCompletedSkillPrompt(completedStep);
        }

        if (data.progress === 100) {
          setCompletionPopup(true);
        }
      }
    } catch (err) {
      console.error("UPDATE STEP ERROR:", err);
      setMessage(err.message || "Nu s-a putut actualiza pasul.");
    } finally {
      setUpdatingStepId(null);
    }
  }

  async function handleAddCompletedSkillToProfile(step) {
    if (!step?.skill_id) {
      setCompletedSkillPrompt(null);
      return;
    }

    setAddingSkillId(step.skill_id);
    setMessage("");

    try {
      await apiFetch("/api/user-skills", {
        method: "POST",
        body: JSON.stringify({
          skill_id: step.skill_id,
          skillId: step.skill_id,
          level: 1,
        }),
      });

      setProfileSkillIds((prev) => {
        const next = new Set(prev);
        next.add(Number(step.skill_id));
        return next;
      });

      setMessage(
        `Skillul ${
          step.skill_name || step.title
        } a fost adăugat în profilul tău la nivel fundamental.`,
      );

      setCompletedSkillPrompt(null);
    } catch (err) {
      console.error("ADD COMPLETED SKILL ERROR:", err);

      if (
        err.message?.toLowerCase().includes("duplicate") ||
        err.message?.toLowerCase().includes("exist")
      ) {
        setProfileSkillIds((prev) => {
          const next = new Set(prev);
          next.add(Number(step.skill_id));
          return next;
        });

        setCompletedSkillPrompt(null);
        setMessage("Skillul există deja în profilul tău.");
      } else {
        setMessage(err.message || "Nu s-a putut adăuga skillul în profil.");
      }
    } finally {
      setAddingSkillId(null);
    }
  }

  async function handleDeleteRoadmap() {
    if (!selectedRoadmap) return;

    const confirmed = window.confirm(
      "Sigur vrei să ștergi acest plan de dezvoltare?",
    );

    if (!confirmed) return;

    setDeletingRoadmap(true);
    setMessage("");

    try {
      await apiFetch(`/api/roadmaps/${selectedRoadmap.id}`, {
        method: "DELETE",
      });

      setSelectedRoadmap(null);
      setSelectedRoadmapId("");
      setShowPlanSteps(false);

      await loadInitialData();

      setMessage("Roadmap șters.");
    } catch (err) {
      console.error("DELETE ROADMAP ERROR:", err);
      setMessage(err.message || "Nu s-a putut șterge roadmap-ul.");
    } finally {
      setDeletingRoadmap(false);
    }
  }

  const selectedJob = useMemo(() => {
    return jobs.find((job) => String(job.id) === String(selectedJobId));
  }, [jobs, selectedJobId]);

  const completedSteps = useMemo(() => {
    if (!selectedRoadmap?.steps?.length) return 0;

    return selectedRoadmap.steps.filter((step) => step.status === "COMPLETED")
      .length;
  }, [selectedRoadmap]);

  const validatedSkills = useMemo(() => {
    if (!selectedRoadmap?.steps?.length) return [];

    const unique = new Map();

    selectedRoadmap.steps.forEach((step) => {
      const isAddedToProfile =
        step.skill_id && profileSkillIds.has(Number(step.skill_id));

      if (
        step.status === "COMPLETED" &&
        isValidationStep(step) &&
        isAddedToProfile
      ) {
        unique.set(Number(step.skill_id), {
          id: Number(step.skill_id),
          name: step.skill_name || step.title,
        });
      }
    });

    return Array.from(unique.values());
  }, [selectedRoadmap, profileSkillIds]);

  const visibleSteps = useMemo(() => {
    return getVisibleSteps(selectedRoadmap, profileSkillIds);
  }, [selectedRoadmap, profileSkillIds]);

  const nextStep = useMemo(() => {
    return getNextStep(selectedRoadmap, profileSkillIds);
  }, [selectedRoadmap, profileSkillIds]);

  const activeRoadmaps = useMemo(() => {
    return roadmaps.filter(
      (roadmap) =>
        roadmap.status !== "COMPLETED" && Number(roadmap.progress || 0) < 100,
    ).length;
  }, [roadmaps]);

  const completedRoadmaps = useMemo(() => {
    return roadmaps.filter(
      (roadmap) =>
        roadmap.status === "COMPLETED" || Number(roadmap.progress || 0) === 100,
    ).length;
  }, [roadmaps]);

  return (
    <AppLayout
      title="Planuri de dezvoltare"
      subtitle="Transformă skillurile lipsă în pași clari de învățare."
    >
      <div style={styles.page}>
        {message && (
          <MesajFeedback
            message={message}
            type={
              message.toLowerCase().includes("nu s-a") ||
              message.toLowerCase().includes("eroare") ||
              message.toLowerCase().includes("există deja")
                ? "error"
                : "success"
            }
          />
        )}
        {loading ? (
          <div style={styles.card}>
            <div style={styles.muted}>Se încarcă planurile...</div>
          </div>
        ) : (
          <>
            <section style={styles.heroCard}>
              <div style={styles.heroContent}>
                <div style={styles.eyebrow}>SkillTrack Roadmaps</div>

                <h2 style={styles.heroTitle}>
                  Transformă joburile salvate în learning plan-uri clare.
                </h2>

                <p style={styles.heroText}>
                  Alege un job salvat, generează un plan de dezvoltare și
                  urmărește progresul pas cu pas. Fiecare etapă te ajută să
                  acoperi skillurile lipsă într-un mod organizat.
                </p>
              </div>

              <div style={styles.heroStatsPanel}>
                <div style={styles.mainRoadmapStat}>
                  <span>Learning plan-uri</span>
                  <strong>{roadmaps.length}</strong>
                </div>

                <div style={styles.smallRoadmapStats}>
                  <MiniStat value={activeRoadmaps} label="Active" />
                  <MiniStat value={completedRoadmaps} label="Finalizate" />
                </div>
              </div>
            </section>

            <section style={styles.activeRoadmapCard}>
              <div style={styles.activeTop}>
                <div>
                  <div style={styles.sectionLabel}>Roadmap activ</div>

                  <h2 style={styles.activeTitle}>
                    {selectedRoadmap?.title || "Niciun roadmap selectat"}
                  </h2>

                  <p style={styles.activeSubtitle}>
                    {selectedRoadmap
                      ? selectedRoadmap.description ||
                        "Plan generat pe baza skillurilor lipsă."
                      : "Alege un job salvat sau selectează un roadmap existent."}
                  </p>
                </div>

                {selectedRoadmap && (
                  <div style={styles.progressCircle}>
                    <strong>{selectedRoadmap.progress || 0}%</strong>
                    <span>{getRoadmapStatusText(selectedRoadmap)}</span>
                  </div>
                )}
              </div>

              {selectedRoadmap ? (
                <>
                  <div style={styles.progressBarLarge}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${selectedRoadmap.progress || 0}%`,
                      }}
                    />
                  </div>

                  <div style={styles.activeMetaGrid}>
                    <InfoBox
                      label="Pași finalizați"
                      value={`${completedSteps}/${
                        selectedRoadmap.steps?.length || 0
                      }`}
                    />

                    <InfoBox
                      label="Următorul pas"
                      value={nextStep?.title || "Toți pașii sunt finalizați"}
                    />

                    <InfoBox
                      label="Categorie ML job"
                      value={selectedRoadmap.ml_predicted_category || "N/A"}
                    />
                  </div>

                  <div style={styles.activeActions}>
                    <button
                      type="button"
                      style={styles.primaryButton}
                      onClick={() => {
                        setShowPlanSteps(true);

                        setTimeout(() => {
                          const el = document.getElementById("roadmap-steps");
                          el?.scrollIntoView({ behavior: "smooth" });
                        }, 50);
                      }}
                    >
                      Continuă learning plan
                    </button>

                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={() => setShowRoadmapList((prev) => !prev)}
                    >
                      {showRoadmapList
                        ? "Ascunde roadmap-urile"
                        : "Schimbă roadmap"}
                    </button>

                    <button
                      type="button"
                      style={styles.dangerButton}
                      onClick={handleDeleteRoadmap}
                      disabled={deletingRoadmap}
                    >
                      {deletingRoadmap ? "Se șterge..." : "Șterge"}
                    </button>
                  </div>
                </>
              ) : (
                <EmptyState message="Nu ai selectat încă un roadmap." />
              )}
            </section>

            <section style={styles.card}>
              <div style={styles.dropdownHeader}>
                <div>
                  <div style={styles.sectionLabel}>Alege job salvat</div>

                  <h2 style={styles.sectionTitle}>
                    Generează un learning plan
                  </h2>

                  <p style={styles.smallText}>
                    Deschide joburile salvate și alege pentru care vrei să
                    creezi un plan de dezvoltare.
                  </p>
                </div>

                <div style={styles.dropdownActions}>
                  <span style={styles.countPill}>
                    {jobs.length} {jobs.length === 1 ? "job" : "joburi"}
                  </span>

                  <button
                    type="button"
                    style={styles.dropdownButton}
                    onClick={() => setShowSavedJobs((prev) => !prev)}
                  >
                    {showSavedJobs ? "Închide joburile" : "Deschide joburile"}
                    <span style={styles.dropdownArrow}>
                      {showSavedJobs ? "↑" : "↓"}
                    </span>
                  </button>
                </div>
              </div>

              {showSavedJobs && (
                <>
                  {jobs.length > 0 ? (
                    <div style={styles.savedJobsGrid}>
                      {jobs.map((job) => {
                        const isSelected =
                          String(selectedJobId) === String(job.id);

                        const scoreTone = getScoreTone(job.match_score);

                        return (
                          <article
                            key={job.id}
                            style={{
                              ...styles.savedJobCard,
                              ...(isSelected ? styles.savedJobCardActive : {}),
                            }}
                            onClick={() => setSelectedJobId(String(job.id))}
                          >
                            <div style={styles.savedJobTop}>
                              <div style={styles.savedJobTitleWrap}>
                                <strong>{job.title}</strong>

                                <span>
                                  {job.company || "Companie necunoscută"} ·{" "}
                                  {job.location || "Locație nespecificată"}
                                </span>
                              </div>

                              <div
                                style={{
                                  ...styles.savedJobScore,
                                  ...scoreTone,
                                }}
                              >
                                {job.match_score ?? 0}%
                              </div>
                            </div>

                            <div style={styles.savedJobMeta}>
                              <span>{job.work_mode || "Mod nespecificat"}</span>
                              <span>
                                {job.employment_type || "Tip nespecificat"}
                              </span>
                              <span>
                                ML: {job.ml_predicted_category || "N/A"}
                              </span>
                            </div>

                            <div style={styles.savedJobFooter}>
                              <span>
                                {isSelected
                                  ? "Job selectat pentru learning plan"
                                  : "Selectează jobul sau generează direct"}
                              </span>

                              <button
                                type="button"
                                style={styles.smallGenerateButton}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedJobId(String(job.id));
                                  handleGenerateRoadmap(job.id);
                                }}
                                disabled={generatingJobId === job.id}
                              >
                                {generatingJobId === job.id
                                  ? "Se generează..."
                                  : "Generează learning plan"}
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState message="Nu ai încă joburi salvate. Analizează și salvează un job înainte să generezi un learning plan." />
                  )}
                </>
              )}
            </section>

            <section style={styles.card}>
              <div style={styles.dropdownHeader}>
                <div>
                  <div style={styles.sectionLabel}>Roadmap-urile mele</div>

                  <h2 style={styles.sectionTitle}>Preview planuri salvate</h2>

                  <p style={styles.smallText}>
                    Deschide lista ca să alegi rapid alt learning plan.
                  </p>
                </div>

                <div style={styles.dropdownActions}>
                  <span style={styles.countPill}>
                    {roadmaps.length}{" "}
                    {roadmaps.length === 1 ? "plan" : "planuri"}
                  </span>

                  <button
                    type="button"
                    style={styles.dropdownButton}
                    onClick={() => setShowRoadmapList((prev) => !prev)}
                  >
                    {showRoadmapList ? "Închide lista" : "Deschide lista"}
                    <span style={styles.dropdownArrow}>
                      {showRoadmapList ? "↑" : "↓"}
                    </span>
                  </button>
                </div>
              </div>

              {showRoadmapList && (
                <>
                  {roadmaps.length > 0 ? (
                    <div style={styles.roadmapList}>
                      {roadmaps.map((roadmap) => {
                        const isSelected =
                          String(selectedRoadmapId) === String(roadmap.id);

                        const previewStatus = getRoadmapStatusText(roadmap);

                        return (
                          <button
                            key={roadmap.id}
                            type="button"
                            style={{
                              ...styles.roadmapPreviewCard,
                              ...(isSelected
                                ? styles.roadmapPreviewCardActive
                                : {}),
                            }}
                            onClick={() => {
                              setSelectedRoadmapId(String(roadmap.id));
                              setShowRoadmapList(false);
                              setShowPlanSteps(false);
                            }}
                          >
                            <div style={styles.roadmapPreviewHeader}>
                              <div style={styles.roadmapPreviewTitleWrap}>
                                <strong>{roadmap.title}</strong>

                                <span>
                                  {roadmap.job_company ||
                                    "Companie necunoscută"}{" "}
                                  · {formatDate(roadmap.created_at)}
                                </span>
                              </div>

                              <div style={styles.roadmapPreviewProgress}>
                                {roadmap.progress || 0}%
                              </div>
                            </div>

                            <div style={styles.progressBar}>
                              <div
                                style={{
                                  ...styles.progressFill,
                                  width: `${roadmap.progress || 0}%`,
                                }}
                              />
                            </div>

                            <div style={styles.roadmapPreviewMeta}>
                              <span
                                style={{
                                  ...styles.previewStatusPill,
                                  ...getPreviewStatusStyle(previewStatus),
                                }}
                              >
                                {previewStatus}
                              </span>

                              <span>
                                {roadmap.completed_steps || 0}/
                                {roadmap.total_steps || 0} pași
                              </span>
                            </div>

                            {isSelected && (
                              <div style={styles.selectedRoadmapHint}>
                                Roadmap afișat acum
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState message="Nu ai încă roadmap-uri. Alege un job și generează primul plan." />
                  )}
                </>
              )}
            </section>

            <section id="roadmap-steps" style={styles.card}>
              <div style={styles.dropdownHeader}>
                <div>
                  <div style={styles.sectionLabel}>Plan de dezvoltare</div>

                  <h2 style={styles.sectionTitle}>
                    {selectedRoadmap?.title || "Niciun roadmap selectat"}
                  </h2>

                  <p style={styles.smallText}>
                    Deschide planul pentru a vedea pașii concreți și a actualiza
                    progresul fiecărei etape.
                  </p>
                </div>

                <div style={styles.dropdownActions}>
                  <span style={styles.countPill}>
                    {visibleSteps.length}{" "}
                    {visibleSteps.length === 1
                      ? "pas vizibil"
                      : "pași vizibili"}
                  </span>

                  <button
                    type="button"
                    style={styles.dropdownButton}
                    onClick={() => setShowPlanSteps((prev) => !prev)}
                    disabled={!selectedRoadmap}
                  >
                    {showPlanSteps ? "Închide planul" : "Deschide planul"}
                    <span style={styles.dropdownArrow}>
                      {showPlanSteps ? "↑" : "↓"}
                    </span>
                  </button>
                </div>
              </div>

              {showPlanSteps && (
                <>
                  {validatedSkills.length > 0 && (
                    <div style={styles.validatedSkillsBox}>
                      <div style={styles.validatedSkillsHeader}>
                        <span>Skilluri validate și adăugate în profil</span>
                        <strong>{validatedSkills.length}</strong>
                      </div>

                      <div style={styles.validatedSkillsList}>
                        {validatedSkills.map((skill) => (
                          <span
                            key={skill.id}
                            style={styles.validatedSkillChip}
                          >
                            ✓ {skill.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {loadingDetails ? (
                    <div style={styles.muted}>Se încarcă detaliile...</div>
                  ) : visibleSteps.length > 0 ? (
                    <div style={styles.stepsList}>
                      {visibleSteps.map((step) => (
                        <article key={step.id} style={styles.stepCard}>
                          <div style={styles.stepNumber}>{step.step_order}</div>

                          <div style={styles.stepContent}>
                            <div style={styles.stepHeader}>
                              <div>
                                <h3 style={styles.stepTitle}>{step.title}</h3>

                                <div style={styles.stepMeta}>
                                  {getStepMeta(step)}
                                </div>
                              </div>

                              <div style={styles.statusButtonGroup}>
                                {STEP_STATUS_OPTIONS.map((option) => {
                                  const isActive = step.status === option.value;

                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      disabled={updatingStepId === step.id}
                                      onClick={() =>
                                        handleStepStatusChange(
                                          step.id,
                                          option.value,
                                        )
                                      }
                                      style={{
                                        ...styles.statusButton,
                                        ...(option.value === "NOT_STARTED"
                                          ? styles.statusButtonNotStarted
                                          : {}),
                                        ...(option.value === "IN_PROGRESS"
                                          ? styles.statusButtonInProgress
                                          : {}),
                                        ...(option.value === "COMPLETED"
                                          ? styles.statusButtonCompleted
                                          : {}),
                                        ...(isActive
                                          ? styles.statusButtonActive
                                          : {}),
                                        ...(isActive &&
                                        option.value === "NOT_STARTED"
                                          ? styles.statusButtonActiveNotStarted
                                          : {}),
                                        ...(isActive &&
                                        option.value === "IN_PROGRESS"
                                          ? styles.statusButtonActiveInProgress
                                          : {}),
                                        ...(isActive &&
                                        option.value === "COMPLETED"
                                          ? styles.statusButtonActiveCompleted
                                          : {}),
                                        opacity:
                                          updatingStepId === step.id ? 0.65 : 1,
                                      }}
                                    >
                                      {option.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <p style={styles.stepDescription}>
                              {step.description}
                            </p>

                            {step.status === "COMPLETED" &&
                              step.skill_id &&
                              isValidationStep(step) &&
                              !profileSkillIds.has(Number(step.skill_id)) && (
                                <button
                                  type="button"
                                  style={styles.smallAddButton}
                                  onClick={() => setCompletedSkillPrompt(step)}
                                >
                                  Adaugă skill ca nivel fundamental
                                </button>
                              )}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState message="Toate skillurile validate au fost adăugate în profil. Poți continua cu alt roadmap sau genera unul nou." />
                  )}
                </>
              )}
            </section>
          </>
        )}

        {completedSkillPrompt && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <div style={styles.modalEmoji}>✨</div>

              <h3 style={styles.modalTitle}>Skill validat</h3>

              <p style={styles.modalText}>
                Ai finalizat etapa de validare pentru{" "}
                <strong>
                  {completedSkillPrompt.skill_name ||
                    completedSkillPrompt.title}
                </strong>
                . Vrei să adaugi acest skill în profilul tău la nivel
                fundamental?
              </p>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={() =>
                    handleAddCompletedSkillToProfile(completedSkillPrompt)
                  }
                  disabled={addingSkillId === completedSkillPrompt.skill_id}
                >
                  {addingSkillId === completedSkillPrompt.skill_id
                    ? "Se adaugă..."
                    : "Adaugă ca nivel fundamental"}
                </button>

                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => setCompletedSkillPrompt(null)}
                >
                  Nu acum
                </button>
              </div>
            </div>
          </div>
        )}

        {completionPopup && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <div style={styles.modalEmoji}>🎉</div>

              <h3 style={styles.modalTitle}>Felicitări!</h3>

              <p style={styles.modalText}>
                Ai finalizat 100% din acest plan de dezvoltare. Roadmap-ul este
                marcat ca finalizat, iar progresul tău este salvat.
              </p>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={() => setCompletionPopup(false)}
                >
                  Super!
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function MiniStat({ value, label }) {
  return (
    <div style={styles.miniStat}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div style={styles.infoBox}>
      <span>{label}</span>
      <strong>{value}</strong>
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
  page: {
    display: "grid",
    gap: 16,
    paddingBottom: 24,
  },

  message: {
    padding: 12,
    borderRadius: 12,
    background: "#ffffff",
    color: "#374151",
    boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
  },

  muted: {
    color: "#9ca3af",
    fontSize: 14,
  },

  card: {
    background: "#ffffff",
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 10px 30px rgba(15,23,42,0.05)",
    border: "1px solid #e5e7eb",
  },

  heroCard: {
    display: "grid",
    gridTemplateColumns: "1fr 320px",
    gap: 22,
    padding: 24,
    borderRadius: 24,
    background:
      "radial-gradient(circle at top left, #eef2ff 0, #ffffff 45%, #f8fafc 100%)",
    border: "1px solid #dbeafe",
    boxShadow: "0 18px 50px rgba(15,23,42,0.08)",
  },

  heroContent: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: 900,
    color: "#4f46e5",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 8,
  },

  heroTitle: {
    margin: 0,
    fontSize: 32,
    lineHeight: 1.12,
    color: "#111827",
    letterSpacing: "-0.045em",
    maxWidth: 760,
  },

  heroText: {
    margin: "12px 0 0",
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.7,
    maxWidth: 780,
  },

  heroStatsPanel: {
    display: "grid",
    gap: 12,
  },

  mainRoadmapStat: {
    minHeight: 130,
    borderRadius: 22,
    background: "#111827",
    color: "#ffffff",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },

  smallRoadmapStats: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },

  miniStat: {
    borderRadius: 16,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 5,
    boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
  },

  activeRoadmapCard: {
    background: "#ffffff",
    borderRadius: 22,
    padding: 22,
    boxShadow: "0 14px 40px rgba(15,23,42,0.07)",
    border: "1px solid #e0e7ff",
  },

  activeTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    alignItems: "flex-start",
    marginBottom: 16,
  },

  activeTitle: {
    margin: 0,
    color: "#111827",
    fontSize: 26,
    letterSpacing: "-0.035em",
  },

  activeSubtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.65,
    maxWidth: 860,
  },

  progressCircle: {
    minWidth: 112,
    minHeight: 112,
    borderRadius: "50%",
    background: "#ecfdf5",
    color: "#166534",
    border: "1px solid #bbf7d0",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },

  progressBarLarge: {
    height: 12,
    borderRadius: 999,
    background: "#e5e7eb",
    overflow: "hidden",
    marginBottom: 16,
  },

  progressBar: {
    height: 9,
    borderRadius: 999,
    background: "#e5e7eb",
    overflow: "hidden",
    marginBottom: 10,
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #378ADD, #1D9E75)",
  },

  activeMetaGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 2fr 1fr",
    gap: 12,
    marginBottom: 16,
  },

  infoBox: {
    padding: 14,
    borderRadius: 14,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 0,
  },

  activeActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  dropdownHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },

  dropdownActions: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: 900,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },

  sectionTitle: {
    margin: 0,
    color: "#111827",
    fontSize: 20,
    letterSpacing: "-0.02em",
  },

  smallText: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.6,
  },

  primaryButton: {
    padding: "11px 15px",
    borderRadius: 12,
    border: "none",
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  secondaryButton: {
    padding: "11px 15px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  dangerButton: {
    padding: "11px 15px",
    borderRadius: 12,
    border: "none",
    background: "#dc2626",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  dropdownButton: {
    border: "none",
    borderRadius: 14,
    padding: "11px 14px",
    fontSize: 14,
    fontWeight: 900,
    cursor: "pointer",
    background: "#111827",
    color: "#ffffff",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },

  dropdownArrow: {
    width: 22,
    height: 22,
    borderRadius: 999,
    background: "rgba(255,255,255,0.14)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
  },

  countPill: {
    padding: "8px 11px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#4338ca",
    fontSize: 13,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  savedJobsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 12,
    marginTop: 16,
  },

  savedJobCard: {
    borderRadius: 18,
    padding: 16,
    cursor: "pointer",
    transition: "0.2s ease",
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
  },

  savedJobCardActive: {
    border: "1px solid #4f46e5",
    background: "#eef2ff",
  },

  savedJobTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 12,
  },

  savedJobTitleWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
  },

  savedJobScore: {
    minWidth: 54,
    height: 54,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    flexShrink: 0,
  },

  savedJobMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  savedJobFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    paddingTop: 12,
    borderTop: "1px solid #e5e7eb",
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    flexWrap: "wrap",
  },

  smallGenerateButton: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "none",
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    whiteSpace: "nowrap",
  },

  roadmapList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 12,
    marginTop: 16,
  },

  roadmapPreviewCard: {
    textAlign: "left",
    borderRadius: 18,
    padding: 16,
    cursor: "pointer",
    transition: "0.2s ease",
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
  },

  roadmapPreviewCardActive: {
    border: "1px solid #4f46e5",
    background: "#eef2ff",
  },

  roadmapPreviewHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    alignItems: "flex-start",
    marginBottom: 12,
  },

  roadmapPreviewTitleWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
  },

  roadmapPreviewProgress: {
    minWidth: 54,
    height: 54,
    borderRadius: "50%",
    background: "#111827",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    flexShrink: 0,
  },

  roadmapPreviewMeta: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    flexWrap: "wrap",
  },

  previewStatusPill: {
    padding: "5px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
  },

  previewStatusNotStarted: {
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca",
  },

  previewStatusInProgress: {
    background: "#fffbeb",
    color: "#92400e",
    border: "1px solid #fde68a",
  },

  previewStatusCompleted: {
    background: "#ecfdf5",
    color: "#166534",
    border: "1px solid #bbf7d0",
  },

  selectedRoadmapHint: {
    marginTop: 12,
    padding: "8px 10px",
    borderRadius: 12,
    background: "#ffffff",
    color: "#4338ca",
    fontSize: 12,
    fontWeight: 900,
    textAlign: "center",
  },

  validatedSkillsBox: {
    marginTop: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    background: "#ecfdf5",
    border: "1px solid #bbf7d0",
  },

  validatedSkillsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
    color: "#166534",
    fontSize: 13,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  validatedSkillsList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },

  validatedSkillChip: {
    padding: "7px 10px",
    borderRadius: 999,
    background: "#ffffff",
    border: "1px solid #86efac",
    color: "#166534",
    fontSize: 13,
    fontWeight: 800,
  },

  stepsList: {
    display: "grid",
    gap: 12,
    marginTop: 16,
  },

  stepCard: {
    display: "grid",
    gridTemplateColumns: "42px 1fr",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
  },

  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#eef2ff",
    color: "#3730a3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
  },

  stepContent: {
    minWidth: 0,
  },

  stepHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 8,
    flexWrap: "wrap",
  },

  stepTitle: {
    margin: 0,
    color: "#111827",
    fontSize: 16,
  },

  stepMeta: {
    marginTop: 5,
    color: "#64748b",
    fontSize: 12,
    fontWeight: 700,
  },

  stepDescription: {
    margin: 0,
    color: "#475569",
    lineHeight: 1.6,
    fontSize: 13,
  },

  statusButtonGroup: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  statusButton: {
    border: "1px solid #e5e7eb",
    borderRadius: 999,
    padding: "8px 10px",
    background: "#ffffff",
    color: "#64748b",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
    transition: "0.15s ease",
  },

  statusButtonNotStarted: {
    borderColor: "#fecaca",
    background: "#fef2f2",
    color: "#991b1b",
  },

  statusButtonInProgress: {
    borderColor: "#fde68a",
    background: "#fffbeb",
    color: "#92400e",
  },

  statusButtonCompleted: {
    borderColor: "#bbf7d0",
    background: "#ecfdf5",
    color: "#166534",
  },

  statusButtonActive: {
    boxShadow: "0 6px 16px rgba(15, 23, 42, 0.08)",
    transform: "translateY(-1px)",
  },

  statusButtonActiveNotStarted: {
    background: "#dc2626",
    borderColor: "#dc2626",
    color: "#ffffff",
  },

  statusButtonActiveInProgress: {
    background: "#f59e0b",
    borderColor: "#f59e0b",
    color: "#ffffff",
  },

  statusButtonActiveCompleted: {
    background: "#16a34a",
    borderColor: "#16a34a",
    color: "#ffffff",
  },

  smallAddButton: {
    marginTop: 12,
    padding: "9px 12px",
    borderRadius: 10,
    border: "1px solid #c7d2fe",
    background: "#eef2ff",
    color: "#3730a3",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 20,
  },

  modal: {
    width: "100%",
    maxWidth: 520,
    background: "#ffffff",
    borderRadius: 20,
    padding: 28,
    boxShadow: "0 24px 70px rgba(15, 23, 42, 0.25)",
    textAlign: "center",
    border: "1px solid #e5e7eb",
  },

  modalEmoji: {
    fontSize: 46,
    marginBottom: 10,
  },

  modalTitle: {
    margin: "0 0 10px",
    color: "#111827",
    fontSize: 24,
  },

  modalText: {
    margin: "0 0 20px",
    color: "#475569",
    lineHeight: 1.7,
  },

  modalActions: {
    display: "flex",
    justifyContent: "center",
    gap: 12,
    flexWrap: "wrap",
  },

  emptyState: {
    minHeight: 110,
    borderRadius: 14,
    background: "#f8fafc",
    border: "1px dashed #cbd5e1",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 18,
    fontSize: 13,
    marginTop: 16,
  },
};
