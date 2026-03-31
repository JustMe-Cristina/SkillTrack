import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api";
import AppLayout from "../components/AppLayout";

export default function PlanuriDeDezvoltare() {
  const [roadmaps, setRoadmaps] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [expandedRoadmapId, setExpandedRoadmapId] = useState(null);
  const [roadmapDetails, setRoadmapDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [completedSkillPrompt, setCompletedSkillPrompt] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    setMessage("");

    try {
      await Promise.all([fetchRoadmaps(), fetchJobs()]);
    } catch (err) {
      console.error("LOAD ROADMAP DATA ERROR:", err);
      setMessage(err.message || "Eroare la încărcarea datelor.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchRoadmaps() {
    const data = await apiFetch("/api/roadmaps");
    setRoadmaps(data.roadmaps || []);
  }

  async function fetchJobs() {
    const data = await apiFetch("/api/jobs");
    setJobs(data.jobs || []);
  }

  async function generateRoadmap() {
    if (!selectedJobId) {
      setMessage("Selectează un job.");
      return;
    }

    try {
      setMessage("");

      const data = await apiFetch(`/api/roadmaps/generate/${selectedJobId}`, {
        method: "POST",
      });

      setMessage(data.message || "Roadmap generat cu succes.");
      await fetchRoadmaps();
    } catch (err) {
      console.error("GENERATE ROADMAP ERROR:", err);
      setMessage(err.message || "Nu s-a putut genera roadmap-ul.");
    }
  }

  async function toggleRoadmapDetails(roadmapId) {
    if (expandedRoadmapId === roadmapId) {
      setExpandedRoadmapId(null);
      return;
    }

    setExpandedRoadmapId(roadmapId);

    if (roadmapDetails[roadmapId]) return;

    try {
      const data = await apiFetch(`/api/roadmaps/${roadmapId}`);

      setRoadmapDetails((prev) => ({
        ...prev,
        [roadmapId]: {
          roadmap: data.roadmap,
          steps: data.steps || [],
          skill_groups: data.skill_groups || [],
        },
      }));
    } catch (err) {
      console.error("GET ROADMAP DETAILS ERROR:", err);
      setMessage(
        err.message || "Nu s-au putut încărca detaliile roadmap-ului.",
      );
    }
  }

  async function updateStepStatus(roadmapId, stepId, status) {
    try {
      const data = await apiFetch(`/api/roadmaps/steps/${stepId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setMessage(data.message || "Pas actualizat cu succes.");

      if (data.skillCompleted && data.completedSkill) {
        setCompletedSkillPrompt(data.completedSkill);
      }

      const detailsData = await apiFetch(`/api/roadmaps/${roadmapId}`);

      setRoadmapDetails((prev) => ({
        ...prev,
        [roadmapId]: {
          roadmap: detailsData.roadmap,
          steps: detailsData.steps || [],
          skill_groups: detailsData.skill_groups || [],
        },
      }));

      await fetchRoadmaps();
    } catch (err) {
      console.error("UPDATE STEP STATUS ERROR:", err);
      setMessage(err.message || "Nu s-a putut actualiza pasul.");
    }
  }

  async function deleteRoadmap(roadmapId) {
    if (
      !window.confirm(
        "Sigur vrei să ștergi acest roadmap? Acțiunea nu poate fi anulată.",
      )
    ) {
      return;
    }

    try {
      await apiFetch(`/api/roadmaps/${roadmapId}`, {
        method: "DELETE",
      });

      setMessage("Roadmap șters.");

      setRoadmapDetails((prev) => {
        const next = { ...prev };
        delete next[roadmapId];
        return next;
      });

      if (expandedRoadmapId === roadmapId) {
        setExpandedRoadmapId(null);
      }

      await fetchRoadmaps();
    } catch (err) {
      console.error("DELETE ROADMAP ERROR:", err);
      setMessage(err.message || "Nu s-a putut șterge roadmap-ul.");
    }
  }

  async function addCompletedSkillToProfile() {
    if (!completedSkillPrompt) return;

    try {
      const data = await apiFetch("/api/user-skills", {
        method: "POST",
        body: JSON.stringify({
          skillId: Number(completedSkillPrompt.skillId),
          level: 2,
          confidence: 3,
        }),
      });

      setMessage(
        data?.message ||
          `Competența ${completedSkillPrompt.skillName} a fost adăugată la profilul tău.`,
      );
      setCompletedSkillPrompt(null);
      await fetchRoadmaps();
    } catch (err) {
      console.error("ADD COMPLETED SKILL ERROR:", err);

      if (
        err.message === "Skill already added" ||
        err.message === "Skill already exists"
      ) {
        setMessage(
          `${completedSkillPrompt.skillName} era deja în profilul tău.`,
        );
      } else {
        setMessage(err.message || "Nu s-a putut adăuga skillul la profil.");
      }

      setCompletedSkillPrompt(null);
    }
  }

  function renderRequirementStatus(value) {
    if (value === true || value === 1) {
      return <span style={styles.requirementOk}>✓</span>;
    }

    if (value === false || value === 0) {
      return <span style={styles.requirementMissing}>!</span>;
    }

    return null;
  }

  function renderSkillStatusDot(status) {
    if (status === "COMPLETED") {
      return <span style={styles.skillDotCompleted} />;
    }

    if (status === "IN_PROGRESS") {
      return <span style={styles.skillDotInProgress} />;
    }

    return <span style={styles.skillDotNotStarted} />;
  }

  function getStepButtonStyle(currentStatus, buttonStatus) {
    const isActive = currentStatus === buttonStatus;

    if (buttonStatus === "NOT_STARTED") {
      return {
        ...styles.stepBtn,
        background: isActive ? "#111827" : "white",
        color: isActive ? "white" : "#111827",
        border: isActive ? "none" : "1px solid #d1d5db",
      };
    }

    if (buttonStatus === "IN_PROGRESS") {
      return {
        ...styles.stepBtn,
        background: isActive ? "#1d4ed8" : "white",
        color: isActive ? "white" : "#111827",
        border: isActive ? "none" : "1px solid #d1d5db",
      };
    }

    return {
      ...styles.stepBtn,
      background: isActive ? "#15803d" : "white",
      color: isActive ? "white" : "#111827",
      border: isActive ? "none" : "1px solid #d1d5db",
    };
  }

  return (
    <AppLayout
      title="Planuri de dezvoltare"
      subtitle="Generează și urmărește roadmap-urile pentru joburile tale"
    >
      {message && <div style={styles.message}>{message}</div>}

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Generează roadmap</h2>

        <div style={styles.generateRow}>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            style={styles.select}
          >
            <option value="">Selectează job</option>

            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} {job.company ? `(${job.company})` : ""}
              </option>
            ))}
          </select>

          <button onClick={generateRoadmap} style={styles.primaryButton}>
            Generează
          </button>
        </div>
      </div>

      {loading ? (
        <div style={styles.card}>Se încarcă roadmap-urile...</div>
      ) : roadmaps.length === 0 ? (
        <div style={styles.card}>
          <div style={styles.emptyTitle}>
            Nu există încă roadmap-uri generate.
          </div>
          <div style={styles.emptyText}>
            Selectează un job și generează primul tău plan de dezvoltare.
          </div>
        </div>
      ) : (
        <div style={styles.roadmapList}>
          {roadmaps.map((roadmap) => {
            const details = roadmapDetails[roadmap.id];
            const isExpanded = expandedRoadmapId === roadmap.id;

            return (
              <div key={roadmap.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={{ flex: 1 }}>
                    <h3 style={styles.cardTitle}>{roadmap.title}</h3>
                    <p style={styles.cardDescription}>
                      {roadmap.description || "Fără descriere disponibilă."}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <span style={getStatusBadgeStyle(roadmap.status)}>
                      {formatStatus(roadmap.status)}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteRoadmap(roadmap.id)}
                      style={styles.deleteBtn}
                      title="Șterge roadmap"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div style={styles.metaGrid}>
                  <div style={styles.metaCard}>
                    <div style={styles.metaLabel}>Job</div>
                    <div style={styles.metaValue}>
                      {roadmap.job_title || "-"}
                    </div>
                  </div>

                  <div style={styles.metaCard}>
                    <div style={styles.metaLabel}>Companie</div>
                    <div style={styles.metaValue}>{roadmap.company || "-"}</div>
                  </div>

                  <div style={styles.metaCard}>
                    <div style={styles.metaLabel}>Progres</div>
                    <div style={styles.metaValue}>{roadmap.progress || 0}%</div>
                  </div>
                </div>

                {(roadmap.experience_label || roadmap.degree_label) && (
                  <div style={styles.requirementsSummary}>
                    <div style={styles.requirementsTitle}>
                      Eligibilitate față de cerințele jobului
                    </div>

                    <div style={styles.requirementsGrid}>
                      {roadmap.experience_label && (
                        <div style={styles.requirementCard}>
                          <div style={styles.requirementLabel}>Experiență</div>
                          <div style={styles.requirementValueRow}>
                            <span>{roadmap.experience_label}</span>
                            {renderRequirementStatus(
                              roadmap.meets_experience_requirement,
                            )}
                          </div>
                        </div>
                      )}

                      {roadmap.degree_label && (
                        <div style={styles.requirementCard}>
                          <div style={styles.requirementLabel}>Studii</div>
                          <div style={styles.requirementValueRow}>
                            <span>{roadmap.degree_label}</span>
                            {renderRequirementStatus(
                              roadmap.meets_degree_requirement,
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {Array.isArray(roadmap.skill_preview) &&
                  roadmap.skill_preview.length > 0 && (
                    <div style={styles.skillPreviewSection}>
                      <div style={styles.skillPreviewTitle}>
                        Skilluri de dezvoltat
                      </div>

                      <div style={styles.skillPreviewTags}>
                        {roadmap.skill_preview.map((skill, index) => (
                          <span
                            key={`${roadmap.id}-${skill.skill_name}-${index}`}
                            style={
                              skill.is_completed
                                ? styles.skillPreviewTagCompleted
                                : skill.status === "IN_PROGRESS"
                                  ? styles.skillPreviewTagActive
                                  : styles.skillPreviewTag
                            }
                          >
                            {skill.skill_name}
                          </span>
                        ))}
                      </div>

                      {roadmap.next_skill?.skill_name && (
                        <div style={styles.nextSkillBox}>
                          <span style={styles.nextSkillLabel}>
                            Următorul skill recomandat:
                          </span>{" "}
                          <span style={styles.nextSkillValue}>
                            {roadmap.next_skill.skill_name}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                {isExpanded &&
                  details?.skill_groups?.some(
                    (group) => group.status === "COMPLETED",
                  ) && (
                    <SkillProgressAxis skillGroups={details.skill_groups} />
                  )}

                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${roadmap.progress || 0}%`,
                    }}
                  />
                </div>

                <div style={styles.actionsRow}>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => toggleRoadmapDetails(roadmap.id)}
                  >
                    {isExpanded ? "Ascunde pașii" : "Vezi pașii"}
                  </button>
                </div>

                {isExpanded && (
                  <div style={styles.stepsSection}>
                    {!details ? (
                      <div style={styles.loadingSteps}>Se încarcă pașii...</div>
                    ) : details.skill_groups?.length === 0 ? (
                      <div style={styles.emptyText}>
                        Nu există pași pentru acest roadmap.
                      </div>
                    ) : (
                      <>
                        {details.roadmap?.next_skill?.skill_name && (
                          <div style={styles.currentFocusBox}>
                            <div style={styles.currentFocusLabel}>
                              Focus curent
                            </div>
                            <div style={styles.currentFocusValue}>
                              {details.roadmap.next_skill.skill_name}
                            </div>
                            <div style={styles.currentFocusHint}>
                              Acesta este următorul skill recomandat pe baza
                              ordonării din piață și a progresului tău.
                            </div>
                          </div>
                        )}

                        <div style={styles.skillGroupsList}>
                          {details.skill_groups.map((group, groupIndex) => (
                            <div
                              key={`${group.skill_name}-${groupIndex}`}
                              style={styles.skillGroupCard}
                            >
                              <div style={styles.skillGroupHeader}>
                                <div>
                                  <div style={styles.skillGroupTitleRow}>
                                    {renderSkillStatusDot(group.status)}
                                    <h4 style={styles.skillGroupTitle}>
                                      {group.skill_name}
                                    </h4>
                                  </div>
                                  <div style={styles.skillGroupSubtext}>
                                    Frecvență în joburile tale:{" "}
                                    {group.frequency || 0}
                                  </div>
                                </div>

                                <span style={getStatusBadgeStyle(group.status)}>
                                  {formatStatus(group.status)}
                                </span>
                              </div>

                              <div style={styles.groupStepsList}>
                                {group.steps.map((step) => (
                                  <div key={step.id} style={styles.stepCard}>
                                    <div style={styles.stepTop}>
                                      <div>
                                        <div style={styles.stepOrder}>
                                          Pasul {step.step_order}
                                        </div>
                                        <h4 style={styles.stepTitle}>
                                          {step.title}
                                        </h4>
                                        <p style={styles.stepDescription}>
                                          {step.description}
                                        </p>
                                      </div>

                                      <span
                                        style={getStatusBadgeStyle(step.status)}
                                      >
                                        {formatStatus(step.status)}
                                      </span>
                                    </div>

                                    <div style={styles.stepMeta}>
                                      <span>
                                        <strong>Skill:</strong>{" "}
                                        {step.skill_name || "-"}
                                      </span>
                                    </div>

                                    <div style={styles.stepActions}>
                                      <button
                                        type="button"
                                        style={getStepButtonStyle(
                                          step.status,
                                          "NOT_STARTED",
                                        )}
                                        onClick={() =>
                                          updateStepStatus(
                                            roadmap.id,
                                            step.id,
                                            "NOT_STARTED",
                                          )
                                        }
                                      >
                                        Neînceput
                                      </button>

                                      <button
                                        type="button"
                                        style={getStepButtonStyle(
                                          step.status,
                                          "IN_PROGRESS",
                                        )}
                                        onClick={() =>
                                          updateStepStatus(
                                            roadmap.id,
                                            step.id,
                                            "IN_PROGRESS",
                                          )
                                        }
                                      >
                                        În progres
                                      </button>

                                      <button
                                        type="button"
                                        style={getStepButtonStyle(
                                          step.status,
                                          "COMPLETED",
                                        )}
                                        onClick={() =>
                                          updateStepStatus(
                                            roadmap.id,
                                            step.id,
                                            "COMPLETED",
                                          )
                                        }
                                      >
                                        Finalizat
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {completedSkillPrompt && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Skill finalizat 🎉</h3>
            <p style={styles.modalText}>
              Ai completat toți pașii pentru{" "}
              <strong>{completedSkillPrompt.skillName}</strong>.
            </p>
            <p style={styles.modalText}>
              Dacă skillul e deja în profilul tău, nivelul a fost actualizat
              automat la <strong>Independent</strong>. Dacă nu e în profil, vrei
              să îl adaugi?
            </p>

            <div style={styles.modalActions}>
              <button
                type="button"
                style={styles.primaryButton}
                onClick={addCompletedSkillToProfile}
              >
                Da, adaugă skillul
              </button>

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => setCompletedSkillPrompt(null)}
              >
                Mai târziu
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function SkillProgressAxis({ skillGroups }) {
  const allGroups = useMemo(() => skillGroups || [], [skillGroups]);

  const completedGroups = useMemo(() => {
    return [...allGroups]
      .filter((group) => group.status === "COMPLETED")
      .sort((a, b) => {
        const aTime = a.completed_at ? new Date(a.completed_at).getTime() : 0;
        const bTime = b.completed_at ? new Date(b.completed_at).getTime() : 0;
        return aTime - bTime;
      });
  }, [allGroups]);

  if (!completedGroups.length || !allGroups.length) return null;

  const totalSlots = allGroups.length;

  return (
    <div style={styles.skillAxisSection}>
      <div style={styles.skillAxisTitle}>Progres competențe</div>

      <div style={styles.skillAxisWrapper}>
        <div style={styles.skillAxisLine} />

        {Array.from({ length: totalSlots }).map((_, index) => {
          const leftPercent = ((index + 0.5) / totalSlots) * 100;
          const skillForSlot = completedGroups[index];

          return (
            <div
              key={index}
              style={{
                ...styles.skillAxisPointAbsolute,
                left: `${leftPercent}%`
              }}
            >
              {skillForSlot ? (
                <>
                  <span style={styles.skillDotCompleted} />
                  <div style={styles.skillAxisLabel}>
                    {skillForSlot.skill_name}
                  </div>
                </>
              ) : (
                <span style={styles.skillDotPlaceholder} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
function formatStatus(status) {
  if (status === "NOT_STARTED") return "Neînceput";
  if (status === "IN_PROGRESS") return "În progres";
  if (status === "COMPLETED") return "Finalizat";
  return status || "-";
}

function getStatusBadgeStyle(status) {
  const base = {
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  };

  if (status === "NOT_STARTED") {
    return {
      ...base,
      background: "#f3f4f6",
      color: "#374151",
    };
  }

  if (status === "IN_PROGRESS") {
    return {
      ...base,
      background: "#dbeafe",
      color: "#1d4ed8",
    };
  }

  if (status === "COMPLETED") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#15803d",
    };
  }

  return {
    ...base,
    background: "#e5e7eb",
    color: "#111827",
  };
}

const styles = {
  message: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    background: "#ffffff",
    color: "#374151",
    boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
  },
  card: {
    background: "white",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
    marginBottom: 20,
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: 16,
    color: "#111827",
  },
  generateRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  select: {
    padding: 12,
    borderRadius: 8,
    border: "1px solid #d1d5db",
    minWidth: 280,
  },
  roadmapList: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: 10,
    color: "#111827",
  },
  cardDescription: {
    margin: 0,
    color: "#4b5563",
    lineHeight: 1.7,
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 14,
    marginTop: 20,
  },
  metaCard: {
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 14,
  },
  metaLabel: {
    fontSize: 12,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  metaValue: {
    marginTop: 8,
    color: "#111827",
    fontWeight: 700,
  },
  requirementsSummary: {
    marginTop: 18,
    padding: 16,
    borderRadius: 12,
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
  },
  requirementsTitle: {
    fontSize: 12,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    fontWeight: 700,
  },
  requirementsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
  },
  requirementCard: {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 12,
  },
  requirementLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#6b7280",
  },
  requirementValueRow: {
    marginTop: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    color: "#111827",
    fontWeight: 600,
  },
  requirementOk: {
    width: 22,
    height: 22,
    borderRadius: "999px",
    background: "#dcfce7",
    color: "#166534",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    flexShrink: 0,
  },
  requirementMissing: {
    width: 22,
    height: 22,
    borderRadius: "999px",
    background: "#fee2e2",
    color: "#991b1b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    flexShrink: 0,
  },
  skillPreviewSection: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
  },
  skillPreviewTitle: {
    fontSize: 12,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    fontWeight: 700,
  },
  skillPreviewTags: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  skillPreviewTag: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "#f3f4f6",
    color: "#374151",
    fontWeight: 600,
    fontSize: 13,
  },
  skillPreviewTagActive: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "#dbeafe",
    color: "#1d4ed8",
    fontWeight: 700,
    fontSize: 13,
  },
  skillPreviewTagCompleted: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    fontWeight: 700,
    fontSize: 13,
  },
  nextSkillBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
  },
  nextSkillLabel: {
    color: "#1d4ed8",
    fontSize: 13,
    fontWeight: 700,
  },
  nextSkillValue: {
    color: "#111827",
    fontSize: 14,
    fontWeight: 700,
  },
  skillAxisSection: {
  marginTop: 18,
  padding: 16,
  borderRadius: 12,
  background: "#f9fafb",
  border: "1px solid #e5e7eb"
},
skillAxisTitle: {
  fontSize: 12,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: 1,
  marginBottom: 14,
  fontWeight: 700
},
skillAxisWrapper: {
  position: "relative",
  height: 64
},
skillAxisLine: {
  position: "absolute",
  top: 18,
  left: 0,
  right: 0,
  height: 4,
  borderRadius: 999,
  background: "#d1d5db"
},
skillAxisPointAbsolute: {
  position: "absolute",
  top: 8,
  transform: "translateX(-50%)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  minWidth: 70
},
skillDotCompleted: {
  width: 18,
  height: 18,
  borderRadius: "999px",
  background: "#16a34a",
  border: "3px solid #dcfce7",
  display: "inline-block",
  zIndex: 2
},
skillDotPlaceholder: {
  width: 18,
  height: 18,
  borderRadius: "999px",
  background: "#e5e7eb",
  opacity: 0.45,
  display: "inline-block",
  zIndex: 2
},
skillAxisLabel: {
  textAlign: "center",
  fontSize: 12,
  color: "#374151",
  fontWeight: 600,
  lineHeight: 1.4,
  maxWidth: 90
},
  progressBar: {
    height: 12,
    background: "#e5e7eb",
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 18,
  },
  progressFill: {
    height: "100%",
    background: "#111827",
    borderRadius: 999,
    transition: "width 0.3s ease",
  },
  actionsRow: {
    marginTop: 18,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  stepsSection: {
    marginTop: 20,
    borderTop: "1px solid #e5e7eb",
    paddingTop: 20,
  },
  loadingSteps: {
    color: "#6b7280",
  },
  currentFocusBox: {
    marginBottom: 18,
    padding: 16,
    borderRadius: 12,
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
  },
  currentFocusLabel: {
    fontSize: 12,
    color: "#1d4ed8",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: 700,
    marginBottom: 8,
  },
  currentFocusValue: {
    fontSize: 18,
    fontWeight: 800,
    color: "#111827",
    marginBottom: 6,
  },
  currentFocusHint: {
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 1.6,
  },
  skillGroupsList: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  skillGroupCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    background: "#ffffff",
    padding: 18,
  },
  skillGroupHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  skillGroupTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  skillGroupTitle: {
    margin: 0,
    color: "#111827",
  },
  skillGroupSubtext: {
    color: "#6b7280",
    fontSize: 13,
  },
  groupStepsList: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  stepCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 18,
    background: "#fafafa",
  },
  stepTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
  },
  stepOrder: {
    color: "#6b7280",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  stepTitle: {
    margin: "0 0 8px 0",
    color: "#111827",
  },
  stepDescription: {
    margin: 0,
    color: "#4b5563",
    lineHeight: 1.7,
  },
  stepMeta: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
    marginTop: 14,
    color: "#374151",
    fontSize: 14,
  },
  stepActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 16,
  },
  stepBtn: {
    padding: "8px 14px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    fontFamily: "inherit",
    transition: "all 0.15s ease",
  },
  primaryButton: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "none",
    background: "#111827",
    color: "white",
    cursor: "pointer",
    fontWeight: 600,
  },
  deleteBtn: {
    width: 30,
    height: 30,
    border: "1px solid #fecaca",
    background: "#fff5f5",
    color: "#dc2626",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  secondaryButton: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "white",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 600,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 10,
  },
  emptyText: {
    color: "#6b7280",
    lineHeight: 1.7,
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(17, 24, 39, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  modal: {
    width: "100%",
    maxWidth: 460,
    background: "white",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
  },
  modalTitle: {
    marginTop: 0,
    marginBottom: 12,
    color: "#111827",
  },
  modalText: {
    color: "#4b5563",
    lineHeight: 1.7,
    marginBottom: 12,
  },
  modalActions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 16,
  },
};
