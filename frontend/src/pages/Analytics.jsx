import { useEffect, useState } from "react";
import { API_URL } from "../services/api";
import AppLayout from "../components/AppLayout";

const CATEGORY_COLORS = {
  Data: "#3b82f6",
  ML: "#8b5cf6",
  DevOps: "#f59e0b",
  Dev: "#10b981",
  Business: "#ef4444"
};

export default function Analytics() {

  const [marketData, setMarketData] = useState(null);
  const [loadingMarket, setLoadingMarket] = useState(true);

  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Categoriile expandate — Set cu numele categoriilor deschise
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchMarket();
    fetchProfileVsMarket();
  }, []);

  async function fetchMarket() {
    const token = localStorage.getItem("token");
    setLoadingMarket(true);
    try {
      const res = await fetch(`${API_URL}/api/analytics/market`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) setMarketData(data);
    } catch (err) {
      console.error(err);
      setMessage("Eroare la încărcarea datelor de piață.");
    } finally {
      setLoadingMarket(false);
    }
  }

  async function fetchProfileVsMarket() {
    const token = localStorage.getItem("token");
    setLoadingProfile(true);
    try {
      const res = await fetch(`${API_URL}/api/analytics/profile-vs-market`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) setProfileData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProfile(false);
    }
  }

  // Toggle expandare categorie — click deschide/închide
  function toggleCategory(category) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  function scoreColor(score) {
    if (score >= 70) return "#16a34a";
    if (score >= 40) return "#d97706";
    return "#dc2626";
  }

  function gapColor(gap) {
    if (gap >= 0) return "#16a34a";
    if (gap >= -15) return "#d97706";
    return "#dc2626";
  }

  return (
    <AppLayout
      title="Analytics"
      subtitle="Înțelege cum te poziționezi față de piața muncii"
    >
      {message && <div style={styles.message}>{message}</div>}

      {/* ════════════════════════════════════════════════
          SECȚIUNEA 1 — PORTOFOLIU JOBURI
      ════════════════════════════════════════════════ */}
      <div style={styles.card}>
        <div style={styles.sectionLabel}>Portofoliul tău de joburi</div>

        {loadingMarket ? (
          <div style={styles.loadingText}>Se încarcă...</div>
        ) : !marketData || marketData.totalJobs === 0 ? (
          <div style={styles.emptyBox}>
            Nu ai joburi salvate. Adaugă joburi din pagina{" "}
            <strong>Analiză job</strong> pentru a vedea analiza.
          </div>
        ) : (
          <>
            {/* Ordinea: best next skill → scor mediu → distribuție */}
            <div style={styles.statGrid}>

              {/* Best next skill — primul, cel mai important */}
              {marketData.bestNextSkill && (
                <div style={{ ...styles.statCard, borderColor: "#86efac" }}>
                  <div style={styles.statLabel}>skill prioritar acum</div>
                  <div style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "#16a34a",
                    lineHeight: 1.2,
                    marginTop: 8,
                    marginBottom: 6
                  }}>
                    {marketData.bestNextSkill.name}
                  </div>
                  <div style={styles.statSub}>
                    cel mai frecvent cerut în joburile tale
                  </div>
                </div>
              )}

              {/* Scor mediu */}
              <div style={styles.statCard}>
                <div style={styles.statLabel}>scor mediu portofoliu</div>
                <div style={{
                  ...styles.statNumber,
                  color: scoreColor(marketData.avgScore),
                  marginTop: 6
                }}>
                  {marketData.avgScore}%
                </div>
                <div style={styles.statSub}>{marketData.totalJobs} joburi analizate</div>
              </div>

              {/* Distribuție pe 3 zone */}
              <div style={{ ...styles.statCard, flex: 2 }}>
                <div style={styles.statLabel}>Distribuție compatibilitate</div>
                <div style={styles.distributionRow}>

                  <div style={styles.distItem}>
                    <div style={{ ...styles.distNumber, color: "#16a34a" }}>
                      {marketData.distribution.high}
                    </div>
                    <div style={styles.distBar}>
                      <div style={{
                        ...styles.distFill,
                        width: marketData.totalJobs > 0
                          ? `${Math.round((marketData.distribution.high / marketData.totalJobs) * 100)}%`
                          : "0%",
                        background: "#16a34a"
                      }} />
                    </div>
                    <div style={styles.distLabel}>înaltă{"\n"}&gt;70%</div>
                  </div>

                  <div style={styles.distItem}>
                    <div style={{ ...styles.distNumber, color: "#d97706" }}>
                      {marketData.distribution.medium}
                    </div>
                    <div style={styles.distBar}>
                      <div style={{
                        ...styles.distFill,
                        width: marketData.totalJobs > 0
                          ? `${Math.round((marketData.distribution.medium / marketData.totalJobs) * 100)}%`
                          : "0%",
                        background: "#d97706"
                      }} />
                    </div>
                    <div style={styles.distLabel}>medie{"\n"}40-70%</div>
                  </div>

                  <div style={styles.distItem}>
                    <div style={{ ...styles.distNumber, color: "#dc2626" }}>
                      {marketData.distribution.low}
                    </div>
                    <div style={styles.distBar}>
                      <div style={{
                        ...styles.distFill,
                        width: marketData.totalJobs > 0
                          ? `${Math.round((marketData.distribution.low / marketData.totalJobs) * 100)}%`
                          : "0%",
                        background: "#dc2626"
                      }} />
                    </div>
                    <div style={styles.distLabel}>scăzută{"\n"}&lt;40%</div>
                  </div>

                </div>
              </div>

            </div>

          </>
        )}
      </div>

      {/* ════════════════════════════════════════════════
          SECȚIUNEA 2 — PROFIL VS PIAȚĂ cu bar chart
          Metrica: câte din skills CERUTE le ai tu
          acoperire = skills cerute pe care le ai / total skills cerute
          Referință: Social Comparison Theory (Festinger, 1954)
      ════════════════════════════════════════════════ */}
      <div style={styles.card}>
        <div style={styles.sectionLabel}>Profilul tău față de piață</div>
        <div style={styles.sectionSubtitle}>
          Cât din ce cer joburile tale acoperi — apasă pe categorie pentru detalii
        </div>

        {loadingProfile ? (
          <div style={styles.loadingText}>Se calculează...</div>
        ) : !profileData || profileData.categories.length === 0 ? (
          <div style={styles.emptyBox}>
            {profileData?.message || "Nu există date suficiente pentru comparație."}
          </div>
        ) : (
          <>
            {profileData.categories.map((cat) => {
              const color = CATEGORY_COLORS[cat.category] || "#6b7280";
              const isExpanded = expandedCategories.has(cat.category);
              const pct = cat.coveragePercent ?? 0;
              const hasGap = cat.missingSkills && cat.missingSkills.length > 0;

              // Culoarea barei: roșu dacă lipsesc skills cerute, verde dacă acoperit
              const barColor = hasGap
                ? pct < 50 ? "#dc2626" : "#d97706"
                : "#16a34a";

              return (
                <div key={cat.category} style={styles.categoryBlock}>
                  <button
                    style={styles.categoryHeader}
                    onClick={() => toggleCategory(cat.category)}
                  >
                    <div style={styles.categoryLeft}>

                      {/* Rândul 1: nume + procent */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ ...styles.categoryName, color }}>
                          {cat.category}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>
                          {pct}%
                        </span>
                      </div>

                      {/* Bara de acoperire */}
                      <div style={styles.coverageTrack}>
                        <div style={{
                          ...styles.coverageFill,
                          width: `${pct}%`,
                          background: barColor,
                          transition: "width 0.6s ease"
                        }} />
                      </div>

                      {/* Rândul 2: text clar */}
                      <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                        {hasGap ? (
                          <>
                            <span style={{ color: barColor, fontWeight: 600 }}>
                              {cat.coveredRequired}/{cat.marketNeeds} skills cerute acoperite
                            </span>
                            {" · lipsesc: "}
                            <span style={{ color: "#dc2626", fontWeight: 600 }}>
                              {cat.missingSkills.join(", ")}
                            </span>
                          </>
                        ) : (
                          <span style={{ color: "#16a34a", fontWeight: 600 }}>
                            Toate {cat.marketNeeds} skills cerute acoperite ✓
                            {cat.extraSkills && cat.extraSkills.length > 0 && (
                              <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                                {" · în plus: "}{cat.extraSkills.slice(0, 2).join(", ")}
                                {cat.extraSkills.length > 2 ? ` +${cat.extraSkills.length - 2}` : ""}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={styles.categoryRight}>
                      <div style={{ color: "#9ca3af", fontSize: 11 }}>
                        {isExpanded ? "▲" : "▼"}
                      </div>
                    </div>
                  </button>

                  {/* Conținut expandat */}
                  {isExpanded && (
                    <div style={styles.skillsExpanded}>
                      <div style={styles.legend}>
                        <span style={styles.legendItem}>
                          <span style={{ color: "#16a34a", fontWeight: 700 }}>✓</span>
                          &nbsp;ai + cer joburile
                        </span>
                        <span style={styles.legendItem}>
                          <span style={{ color: "#9ca3af" }}>✓</span>
                          &nbsp;ai, dar nu cer joburile
                        </span>
                        <span style={styles.legendItem}>
                          <span style={{ color: "#dc2626", fontWeight: 700 }}>✗</span>
                          &nbsp;nu ai, dar cer joburile
                        </span>
                      </div>
                      <div style={styles.skillsList}>
                        {cat.skills.map((skill) => {
                          const bothHave = skill.userHas && skill.marketNeeds;
                          const onlyUser = skill.userHas && !skill.marketNeeds;
                          const onlyMarket = !skill.userHas && skill.marketNeeds;
                          return (
                            <div key={skill.id} style={{
                              ...styles.skillRow,
                              background: onlyMarket ? "#fef2f2" : bothHave ? "#f0fdf4" : "#f9fafb",
                              borderColor: onlyMarket ? "#fecaca" : bothHave ? "#bbf7d0" : "#e5e7eb"
                            }}>
                              <span style={styles.skillIcon}>
                                {bothHave && <span style={{ color: "#16a34a", fontWeight: 700 }}>✓</span>}
                                {onlyUser && <span style={{ color: "#9ca3af" }}>✓</span>}
                                {onlyMarket && <span style={{ color: "#dc2626", fontWeight: 700 }}>✗</span>}
                              </span>
                              <span style={{
                                ...styles.skillRowName,
                                color: onlyMarket ? "#991b1b" : bothHave ? "#166534" : "#6b7280",
                                fontWeight: onlyMarket ? 600 : 400
                              }}>
                                {skill.name}
                              </span>
                              <div style={styles.skillTags}>
                                {skill.userHas && <span style={styles.tagUser}>în profilul tău</span>}
                                {skill.marketNeeds && <span style={styles.tagMarket}>cerut de joburi</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {profileData.insight && (
              <div style={styles.insightBox}>
                <span style={styles.insightIcon}>📊</span>
                <span style={styles.insightText}>{profileData.insight}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ════════════════════════════════════════════════
          SECȚIUNEA 3 — PREDICȚIE TRAIECTORIE (placeholder)
      ════════════════════════════════════════════════ */}
      <div style={styles.card}>
        <div style={styles.sectionLabel}>Predicție traiectorie</div>
        <div style={styles.sectionSubtitle}>
          Estimare scor la 30, 60 și 90 de zile bazată pe activitatea și profilul tău
        </div>
        <div style={styles.placeholderBox}>
          <div style={styles.placeholderIcon}>🔮</div>
          <div style={styles.placeholderTitle}>În curând</div>
          <div style={styles.placeholderText}>
            Predicția de traiectorie va fi disponibilă după integrarea
            microserviciului ML. Va estima scorul tău folosind un model
            de regresie logistică antrenat pe profilul tău de activitate.
          </div>
        </div>
      </div>

    </AppLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STILURI
// ─────────────────────────────────────────────────────────────────────────────

const styles = {
  message: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    background: "#fff3cd",
    color: "#92400e",
    border: "1px solid #fcd34d"
  },
  card: {
    background: "white",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
    marginBottom: 20
  },
  sectionLabel: {
    color: "#6b7280",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 6
  },
  sectionSubtitle: {
    color: "#9ca3af",
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 1.5
  },
  subLabel: {
    color: "#6b7280",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12
  },
  loadingText: {
    color: "#9ca3af",
    fontSize: 14,
    padding: "20px 0"
  },
  emptyBox: {
    color: "#9ca3af",
    fontSize: 14,
    lineHeight: 1.7,
    padding: "12px 0"
  },

  // ── Market Eligibility ──────────────────────────

  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 16,
    marginBottom: 8
  },
  statCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 18,
    background: "#f9fafb"
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 800,
    color: "#111827",
    lineHeight: 1.1,
    marginBottom: 6
  },
  statTotal: {
    fontSize: 20,
    fontWeight: 500,
    color: "#9ca3af"
  },
  statLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: 600,
    marginBottom: 4
  },
  statSub: {
    fontSize: 12,
    color: "#9ca3af"
  },
  impactRow: {
    display: "grid",
    gridTemplateColumns: "28px 200px 1fr 110px",
    gap: 12,
    alignItems: "center",
    padding: "9px 0",
    borderBottom: "1px solid #f3f4f6"
  },
  rowRank: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: 700,
    textAlign: "center"
  },
  rowSkill: {
    display: "flex",
    alignItems: "center",
    gap: 8
  },
  skillName: {
    fontSize: 14,
    color: "#111827",
    fontWeight: 500
  },
  badge: {
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: 4,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    whiteSpace: "nowrap"
  },
  barTrack: {
    height: 8,
    background: "#e5e7eb",
    borderRadius: 999,
    overflow: "hidden"
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
    transition: "width 0.5s ease"
  },
  rowValues: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 2,
    fontSize: 13
  },

  // ── Distribuție ─────────────────────────────────

  distributionRow: {
    display: "flex",
    gap: 16,
    marginTop: 12,
    alignItems: "flex-end"
  },

  distItem: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6
  },

  distNumber: {
    fontSize: 28,
    fontWeight: 800,
    lineHeight: 1
  },

  distBar: {
    width: "100%",
    height: 8,
    background: "#e5e7eb",
    borderRadius: 999,
    overflow: "hidden"
  },

  distFill: {
    height: "100%",
    borderRadius: 999,
    transition: "width 0.5s ease"
  },

  distLabel: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "center",
    whiteSpace: "pre-line",
    lineHeight: 1.4
  },

  // ── Profil vs Piață ─────────────────────────────

  coverageTrack: {
    height: 8,
    background: "#f3f4f6",
    borderRadius: 999,
    overflow: "hidden"
  },
  coverageFill: {
    height: "100%",
    borderRadius: 999
  },
  categoryBlock: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden"
  },
  categoryHeader: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "14px 18px",
    background: "white",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit"
  },
  categoryLeft: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 6
  },
  categoryNameRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 6
  },
  categoryStats: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap"
  },
  categoryStat: {
    fontSize: 14,
    color: "#6b7280"
  },
  categoryStatDivider: {
    color: "#d1d5db",
    fontSize: 14
  },
  categoryName: {
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  categoryCount: {
    fontSize: 12,
    color: "#9ca3af"
  },
  compareRow: {
    display: "flex",
    alignItems: "center",
    gap: 8
  },
  compareLabel: {
    fontSize: 11,
    color: "#9ca3af",
    minWidth: 34,
    textAlign: "right"
  },
  compareTrack: {
    flex: 1,
    height: 6,
    background: "#e5e7eb",
    borderRadius: 999,
    overflow: "hidden"
  },
  compareFill: {
    height: "100%",
    borderRadius: 999,
    transition: "width 0.5s ease"
  },
  compareValue: {
    fontSize: 12,
    fontWeight: 700,
    minWidth: 36,
    textAlign: "right"
  },
  categoryRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    minWidth: 70
  },
  gapBadge: {
    fontSize: 12,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 6,
    textAlign: "center",
    whiteSpace: "nowrap"
  },

  // ── Skills expandate ────────────────────────────

  skillsExpanded: {
    padding: "0 18px 16px",
    background: "#fafafa",
    borderTop: "1px solid #f3f4f6"
  },
  legend: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
    padding: "12px 0 10px",
    fontSize: 12,
    color: "#6b7280"
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 4
  },
  skillsList: {
    display: "flex",
    flexDirection: "column",
    gap: 6
  },
  skillRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid"
  },
  skillIcon: {
    width: 18,
    textAlign: "center",
    fontSize: 14,
    flexShrink: 0
  },
  skillRowName: {
    fontSize: 14,
    flex: 1
  },
  skillTags: {
    display: "flex",
    gap: 6,
    flexShrink: 0
  },
  tagUser: {
    fontSize: 10,
    padding: "2px 7px",
    borderRadius: 4,
    background: "#e0f2fe",
    color: "#0369a1",
    fontWeight: 500
  },
  tagMarket: {
    fontSize: 10,
    padding: "2px 7px",
    borderRadius: 4,
    background: "#fef3c7",
    color: "#92400e",
    fontWeight: 500
  },

  // ── Insight ─────────────────────────────────────

  insightBox: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    padding: "14px 16px",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 10,
    marginTop: 16
  },
  insightIcon: {
    fontSize: 18,
    flexShrink: 0
  },
  insightText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 1.6
  },

  // ── Placeholder predicție ────────────────────────

  placeholderBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "32px 20px",
    gap: 10,
    background: "#f9fafb",
    borderRadius: 12,
    border: "1px dashed #d1d5db"
  },
  placeholderIcon: { fontSize: 32 },
  placeholderTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: "#374151"
  },
  placeholderText: {
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 1.7,
    maxWidth: 460
  }
};