import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api";
import AppLayout from "../components/AppLayout";

// ─────────────────────────────────────────────────────────────────────────────
// Culori heatmap — stil GitHub, rampă verde
// ─────────────────────────────────────────────────────────────────────────────
function getHeatColor(count) {
  const n = Number(count || 0);
  if (n <= 0) return "#ebedf0";
  if (n === 1) return "#C0DD97";
  if (n === 2) return "#97C459";
  if (n === 3) return "#639922";
  return "#3B6D11";
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Generează 84 de zile (12 săptămâni) pentru heatmap compact
function buildHeatmap(activityMap, detailsMap = {}) {
  const days = [];
  const today = new Date();

  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = formatDate(d);

    days.push({
      date: key,
      count: activityMap.get(key) || 0,
      details: detailsMap[key] || []
    });
  }

  return days;
}

// Traduce action_type în română
function translateAction(type) {
  const map = {
    SKILL_ADDED: "skill adăugat",
    SKILL_UPDATED: "skill actualizat",
    SKILL_DELETED: "skill șters",
    JOB_ANALYZED: "job analizat",
    JOB_SAVED: "job salvat",
    ROADMAP_CREATED: "roadmap creat",
    ROADMAP_STEP_DONE: "pas roadmap finalizat"
  };

  return map[type] || type.toLowerCase().replace(/_/g, " ");
}

export default function PanouPrincipal() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null); // { x, y, content }
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    setMessage("");

    try {
      const data = await apiFetch("/api/analytics/dashboard");
      setDashboard(data);
    } catch (err) {
      console.error("DASHBOARD ERROR:", err);
      setMessage(err.message || "Nu s-au putut încărca datele din dashboard.");
    } finally {
      setLoading(false);
    }
  }

  // Construim heatmap-ul din datele de activitate
  const heatmapData = useMemo(() => {
    if (!dashboard?.activity) return buildHeatmap(new Map(), {});
    const map = new Map(dashboard.activity.map((d) => [d.date, d.count]));
    const detailsMap = {};
    dashboard.activity.forEach((d) => {
      detailsMap[d.date] = d.details || [];
    });
    return buildHeatmap(map, detailsMap);
  }, [dashboard]);

  // Etichete luni — una per lună, poziționată la prima săptămână din lună
  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = null;

    for (let weekIdx = 0; weekIdx < 12; weekIdx++) {
      const day = heatmapData[weekIdx * 7];
      if (!day) continue;

      const month = new Date(day.date).getMonth();
      if (month !== lastMonth) {
        labels.push({
          col: weekIdx,
          label: new Date(day.date).toLocaleString("ro-RO", { month: "short" })
        });
        lastMonth = month;
      }
    }

    return labels;
  }, [heatmapData]);

  const today = new Date();
  const dateStr = today.toLocaleDateString("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const userName = dashboard?.user?.name?.split(" ")[0] || "Cristina";

  return (
    <AppLayout title="Acasă" subtitle="">
      {message && <div style={styles.message}>{message}</div>}

      {loading ? (
        <div style={styles.card}>
          <div style={{ color: "#9ca3af", fontSize: 14 }}>Se încarcă...</div>
        </div>
      ) : (
        <>
          <div style={styles.header}>
            <div>
              <div style={styles.greeting}>Bună, {userName}</div>
              <div style={styles.dateStr}>{dateStr}</div>
            </div>
          </div>

          <div style={styles.gridThree}>
            <div style={{ ...styles.metricCard, borderLeft: "3px solid #378ADD" }}>
              <div style={styles.metricLabel}>Competență</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
                <ScoreCircle score={dashboard?.avgScore || 0} />
                <div>
                  <div style={styles.metricValue}>
                    {dashboard?.avgScore || 0}%
                  </div>
                  <div style={styles.metricSub}>
                    scor mediu · {dashboard?.totalJobs || 0} joburi
                  </div>
                </div>
              </div>
            </div>

            <div style={{ ...styles.metricCard, borderLeft: "3px solid #EF9F27" }}>
              <div style={styles.metricLabel}>Consistență</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
                <div style={{ fontSize: 38, lineHeight: 1 }}>🔥</div>
                <div>
                  <div style={{ ...styles.metricValue, color: "#BA7517" }}>
                    {dashboard?.streak || 0} zile
                  </div>
                  <div style={styles.metricSub}>
                    {dashboard?.activeDays || 0} zile active total
                  </div>
                </div>
              </div>
            </div>

            <div style={{ ...styles.metricCard, borderLeft: "3px solid #1D9E75" }}>
              <div style={styles.metricLabel}>Competențe</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
                <div style={{ ...styles.bigNumber, color: "#1D9E75" }}>
                  {dashboard?.skillCount || 0}
                </div>
                <div>
                  <div style={styles.metricValue}>skills în profil</div>
                  <div style={styles.metricSub}>adăugate manual sau din CV</div>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.gridTwo}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={styles.card}>
                <div style={styles.sectionLabel}>Activitate · ultimele 12 săptămâni</div>

                <div style={styles.heatmapWrap}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: 1 }}>
                      {["L", "", "M", "", "V", "", "D"].map((label, i) => (
                        <div
                          key={i}
                          style={{
                            height: 11,
                            fontSize: 9,
                            color: "#9ca3af",
                            lineHeight: "11px",
                            width: 10
                          }}
                        >
                          {label}
                        </div>
                      ))}
                    </div>

                    <div style={styles.heatmapGrid}>
                      {Array.from({ length: 12 }, (_, weekIdx) => (
                        <div key={weekIdx} style={styles.heatmapCol}>
                          {Array.from({ length: 7 }, (_, dayIdx) => {
                            const cell = heatmapData[weekIdx * 7 + dayIdx];

                            return (
                              <div
                                key={dayIdx}
                                style={{
                                  ...styles.heatCell,
                                  background: cell ? getHeatColor(cell.count) : "#ebedf0",
                                  cursor: cell && cell.count > 0 ? "pointer" : "default"
                                }}
                                onMouseEnter={(e) => {
                                  if (!cell) return;

                                  const rect = e.target.getBoundingClientRect();
                                  const dateObj = new Date(cell.date);
                                  const dayText = dateObj.toLocaleDateString("ro-RO", {
                                    weekday: "short",
                                    day: "numeric",
                                    month: "short"
                                  });

                                  let content =
                                    cell.count === 0
                                      ? `${dayText} · nicio activitate`
                                      : `${dayText} · ${cell.count} acțiuni`;

                                  if (cell.details && cell.details.length > 0) {
                                    content +=
                                      "\n" +
                                      cell.details
                                        .map((d) => `• ${d.count}× ${translateAction(d.type)}`)
                                        .join("\n");
                                  }

                                  setTooltip({
                                    x: rect.left + rect.width / 2,
                                    y: rect.top - 8,
                                    content
                                  });
                                }}
                                onMouseLeave={() => setTooltip(null)}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(12, 14px)",
                      gap: "3px",
                      marginTop: 4,
                      marginLeft: 14
                    }}
                  >
                    {Array.from({ length: 12 }, (_, weekIdx) => {
                      const label = monthLabels.find((m) => m.col === weekIdx);

                      return (
                        <div key={weekIdx} style={{ overflow: "visible", whiteSpace: "nowrap" }}>
                          {label && (
                            <span style={{ fontSize: 9, color: "#9ca3af" }}>
                              {label.label}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={styles.legend}>
                  <span style={styles.legendText}>Mai puțin</span>
                  {[0, 1, 2, 3, 4].map((lvl) => (
                    <div
                      key={lvl}
                      style={{
                        ...styles.legendCell,
                        background: getHeatColor(lvl)
                      }}
                    />
                  ))}
                  <span style={styles.legendText}>Mai mult</span>
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.sectionLabel}>Rol potrivit</div>
                <div style={styles.placeholderBox}>
                  <div style={styles.placeholderText}>
                    Recomandarea rolului va fi calculată automat pe baza
                    competențelor tale folosind cosine similarity față de
                    profilurile de rol din catalog.
                  </div>
                  <span style={styles.comingSoonBadge}>
                    În curând · ML
                  </span>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.sectionLabel}>Top săptămânal</div>

              <LeaderboardRow rank={1} initials="AM" name="A. M." isCurrent={false} />
              <LeaderboardRow rank={2} initials="CP" name="Tu" isCurrent={true} />
              <LeaderboardRow rank={3} initials="RB" name="R. B." isCurrent={false} />
              <LeaderboardRow rank={4} initials="MI" name="M. I." isCurrent={false} />
              <LeaderboardRow rank={5} initials="DC" name="D. C." isCurrent={false} />

              <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #f3f4f6" }}>
                <span style={styles.comingSoonBadge}>
                  Date reale după K-Means clustering
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
            background: "#111827",
            color: "white",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 12,
            lineHeight: 1.6,
            whiteSpace: "pre-line",
            pointerEvents: "none",
            zIndex: 9999,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            maxWidth: 220
          }}
        >
          {tooltip.content}
        </div>
      )}
    </AppLayout>
  );
}

function ScoreCircle({ score }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const safe = Math.max(0, Math.min(100, Number(score || 0)));
  const offset = circ - (safe / 100) * circ;

  return (
    <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke="#378ADD"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          transform="rotate(-90 26 26)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
    </div>
  );
}

function LeaderboardRow({ rank, initials, name, isCurrent }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 8px",
        borderRadius: 8,
        marginBottom: 4,
        background: isCurrent ? "#f5f3ff" : "transparent",
        border: isCurrent ? "1px solid #e0dffe" : "1px solid transparent"
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: isCurrent ? "#7F77DD" : "#9ca3af",
          minWidth: 20
        }}
      >
        #{rank}
      </span>

      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: isCurrent ? "#EEEDFE" : "#f3f4f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 500,
          color: isCurrent ? "#534AB7" : "#6b7280",
          flexShrink: 0
        }}
      >
        {initials}
      </div>

      <span
        style={{
          fontSize: 13,
          fontWeight: isCurrent ? 500 : 400,
          color: isCurrent ? "#111827" : "#6b7280",
          flex: 1
        }}
      >
        {name}
      </span>

      <span style={{ fontSize: 12, color: "#9ca3af" }}>—</span>
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
  header: {
    marginBottom: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  greeting: {
    fontSize: 24,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 4
  },
  dateStr: {
    fontSize: 14,
    color: "#9ca3af",
    textTransform: "capitalize"
  },
  gridThree: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 14,
    marginBottom: 16
  },
  gridTwo: {
    display: "grid",
    gridTemplateColumns: "1fr 300px",
    gap: 16,
    alignItems: "start"
  },
  card: {
    background: "white",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)"
  },
  metricCard: {
    background: "#f9fafb",
    borderRadius: 12,
    padding: "16px 18px",
    border: "1px solid #e5e7eb"
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1.2
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.2
  },
  metricSub: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 3
  },
  bigNumber: {
    fontSize: 42,
    fontWeight: 800,
    lineHeight: 1,
    flexShrink: 0
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 14
  },
  heatmapWrap: {
    marginBottom: 8
  },
  heatmapGrid: {
    display: "flex",
    gap: 3
  },
  heatmapCol: {
    display: "flex",
    flexDirection: "column",
    gap: 3
  },
  heatCell: {
    width: 11,
    height: 11,
    borderRadius: 2
  },
  legend: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginTop: 10
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2
  },
  legendText: {
    fontSize: 11,
    color: "#9ca3af",
    marginRight: 2,
    marginLeft: 2
  },
  placeholderBox: {
    padding: 14,
    background: "#f9fafb",
    borderRadius: 10,
    border: "1px dashed #d1d5db",
    display: "flex",
    flexDirection: "column",
    gap: 10
  },
  placeholderText: {
    fontSize: 13,
    color: "#9ca3af",
    lineHeight: 1.6
  },
  comingSoonBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 9px",
    borderRadius: 4,
    background: "#eff6ff",
    color: "#1d4ed8",
    whiteSpace: "nowrap",
    alignSelf: "flex-start"
  }
};