import { useEffect, useMemo, useState } from "react";
import { API_URL } from "../services/api";
import AppLayout from "../components/AppLayout";

export default function PanouPrincipal() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    const token = localStorage.getItem("token");

    try {
      setLoading(true);
      setMessage("");

      const res = await fetch(`${API_URL}/api/analytics/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (data.ok) {
        setDashboard({
          user: {
            name: data.user?.name || "Cristina"
          },
          avgScore: Number(data.avgScore || 0),
          motivationalMessage:
            data.motivationalMessage ||
            "Ești la început — fiecare skill adăugat contează.",
          streak: Number(data.streak || 0),
          totalActions: Number(data.totalActions || 0),
          activeDays: Number(data.activeDays || 0),
          activity: Array.isArray(data.activity) ? data.activity : [],
          bestJob: data.bestJob || null
        });
      } else {
        setMessage(data.error || "Nu s-a putut încărca dashboard-ul.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Eroare la încărcarea dashboard-ului.");
    } finally {
      setLoading(false);
    }
  }

  const heatmapDays = useMemo(() => {
    if (!dashboard || !Array.isArray(dashboard.activity)) {
      return generateEmptyHeatmap();
    }

    const activityMap = new Map(
      dashboard.activity.map((day) => [day.date, Number(day.count || 0)])
    );

    return generateHeatmapFromActivity(activityMap);
  }, [dashboard]);

  return (
    <AppLayout
      title="Dashboard"
      subtitle={`Bună, ${dashboard?.user?.name || "Cristina"} · Informatică Economică, UBB Cluj`}
    >
      {loading ? (
        <div style={styles.card}>Se încarcă dashboard-ul...</div>
      ) : (
        <>
          {message && <div style={styles.message}>{message}</div>}

          <div style={styles.gridTop}>
            <div style={styles.card}>
              <div style={styles.sectionLabel}>
                Grad de pregătire · {dashboard?.bestJob?.title || "Portofoliu activ"}
              </div>

              <div style={styles.scoreRow}>
                <ScoreCircle score={dashboard?.avgScore || 0} />

                <div style={styles.scoreTextBlock}>
                  <div style={styles.scoreMessage}>
                    {dashboard?.motivationalMessage || "-"}
                  </div>

                  {dashboard?.avgScore >= 40 && dashboard?.avgScore <= 70 && (
                    <div style={styles.flowNote}>
                      (Flow Theory · Csikszentmihalyi, 1990)
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.sectionLabel}>Focus săptămâna aceasta</div>

              <div style={styles.focusTitle}>
                {dashboard?.bestJob?.title
                  ? "Skill prioritar pentru jobul țintă"
                  : "Adaugă joburi"}
              </div>

              <div style={styles.focusText}>
                {dashboard?.bestJob?.title
                  ? `Jobul cu cel mai bun potențial este ${dashboard.bestJob.title}${
                      dashboard.bestJob.company ? ` @ ${dashboard.bestJob.company}` : ""
                    }.`
                  : "După ce salvezi joburi, aici va apărea recomandarea principală a săptămânii."}
              </div>

              <div style={styles.miniStats}>
                <div style={styles.miniCard}>
                  <div style={styles.miniLabel}>🔥 Streak</div>
                  <div style={styles.miniValue}>{dashboard?.streak || 0} zile</div>
                </div>

                <div style={styles.miniCard}>
                  <div style={styles.miniLabel}>📈 Zile active</div>
                  <div style={styles.miniValue}>{dashboard?.activeDays || 0}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.gridBottom}>
            <div style={styles.card}>
              <div style={styles.sectionLabel}>Activitate · ultimele 12 luni</div>

              <div style={styles.activityStats}>
                <div>
                  <div style={styles.activityValue}>{dashboard?.totalActions || 0}</div>
                  <div style={styles.activityLabel}>acțiuni totale</div>
                </div>

                <div>
                  <div style={styles.activityValue}>🔥 {dashboard?.streak || 0}</div>
                  <div style={styles.activityLabel}>streak curent</div>
                </div>

                <div>
                  <div style={styles.activityValue}>{dashboard?.activeDays || 0}</div>
                  <div style={styles.activityLabel}>zile active</div>
                </div>
              </div>

              <Heatmap days={heatmapDays} />
            </div>

            <div style={styles.card}>
              <div style={styles.sectionLabel}>Top săptămânal · clusterul tău</div>

              <div style={styles.leaderboardText}>
                Temporar afișăm placeholder. După K-Means, aici vine leaderboard-ul real.
              </div>

              <div style={styles.leaderboardList}>
                <LeaderboardRow rank={1} name="A.M." score={84} delta={18} />
                <LeaderboardRow rank={2} name="R.P." score={79} delta={15} />
                <LeaderboardRow
                  rank={3}
                  name="Tu"
                  score={dashboard?.avgScore || 0}
                  delta={12}
                  isCurrent
                />
                <LeaderboardRow rank={4} name="M.I." score={63} delta={9} />
                <LeaderboardRow rank={5} name="D.C." score={58} delta={6} />
              </div>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}

function ScoreCircle({ score }) {
  const radius = 54;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const safeScore = Math.max(0, Math.min(100, Number(score || 0)));
  const offset = circumference - (safeScore / 100) * circumference;

  return (
    <div style={styles.scoreCircleWrap}>
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="#111827"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset: offset, transition: "stroke-dashoffset 0.9s ease" }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          transform={`rotate(-90 ${radius} ${radius})`}
        />
      </svg>

      <div style={styles.scoreCenter}>
        <div style={styles.scoreNumber}>{safeScore}%</div>
      </div>
    </div>
  );
}

function Heatmap({ days }) {
  const safeDays = Array.isArray(days) ? days : [];

  return (
    <div style={styles.heatmapSection}>
      <div style={styles.heatmapGrid}>
        {safeDays.map((day) => (
          <div
            key={day.date}
            title={`${day.date} · ${day.count} acțiuni`}
            style={{
              ...styles.heatmapCell,
              background: getHeatColor(day.count)
            }}
          />
        ))}
      </div>

      <div style={styles.legend}>
        <span style={styles.legendText}>Mai puțin</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span
            key={level}
            style={{
              ...styles.legendCell,
              background: getHeatColor(level)
            }}
          />
        ))}
        <span style={styles.legendText}>Mai mult</span>
      </div>
    </div>
  );
}

function LeaderboardRow({ rank, name, score, delta, isCurrent = false }) {
  const safeScore = Math.max(0, Math.min(100, Number(score || 0)));

  return (
    <div
      style={{
        ...styles.leaderboardRow,
        ...(isCurrent ? styles.leaderboardRowActive : {})
      }}
    >
      <div style={styles.leaderboardRank}>{rank}</div>
      <div style={styles.leaderboardName}>{name}</div>
      <div style={styles.leaderboardBarWrap}>
        <div style={{ ...styles.leaderboardBar, width: `${safeScore}%` }} />
      </div>
      <div style={styles.leaderboardScore}>{safeScore}%</div>
      <div style={styles.leaderboardDelta}>+{delta}</div>
    </div>
  );
}

function generateEmptyHeatmap() {
  const days = [];
  const today = new Date();

  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    days.push({ date: formatDate(date), count: 0 });
  }

  return days;
}

function generateHeatmapFromActivity(activityMap) {
  const days = [];
  const today = new Date();

  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = formatDate(date);

    days.push({
      date: key,
      count: activityMap.get(key) || 0
    });
  }

  return days;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getHeatColor(count) {
  const safeCount = Number(count || 0);
  if (safeCount <= 0) return "#f3f4f6";
  if (safeCount === 1) return "#d1fae5";
  if (safeCount === 2) return "#86efac";
  if (safeCount === 3) return "#4ade80";
  return "#16a34a";
}

const styles = {
  message: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    background: "#ffffff",
    color: "#374151"
  },
  gridTop: {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: 20,
    marginBottom: 20
  },
  gridBottom: {
    display: "grid",
    gridTemplateColumns: "1.4fr 0.8fr",
    gap: 20
  },
  card: {
    background: "white",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)"
  },
  sectionLabel: {
    color: "#6b7280",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 20
  },
  scoreRow: {
    display: "flex",
    alignItems: "center",
    gap: 28,
    flexWrap: "wrap"
  },
  scoreCircleWrap: {
    position: "relative",
    width: 108,
    height: 108
  },
  scoreCenter: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: 800,
    color: "#111827"
  },
  scoreTextBlock: {
    flex: 1,
    minWidth: 240
  },
  scoreMessage: {
    fontSize: 26,
    lineHeight: 1.35,
    fontWeight: 700,
    color: "#111827"
  },
  flowNote: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
    fontStyle: "italic"
  },
  focusTitle: {
    fontSize: 28,
    fontWeight: 800,
    color: "#111827",
    marginBottom: 12
  },
  focusText: {
    fontSize: 16,
    lineHeight: 1.6,
    color: "#4b5563",
    marginBottom: 22
  },
  miniStats: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14
  },
  miniCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    background: "#f9fafb"
  },
  miniLabel: {
    color: "#6b7280",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  miniValue: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: 800,
    color: "#111827"
  },
  activityStats: {
    display: "flex",
    gap: 36,
    marginBottom: 18,
    flexWrap: "wrap"
  },
  activityValue: {
    fontSize: 32,
    fontWeight: 800,
    color: "#111827"
  },
  activityLabel: {
    marginTop: 4,
    color: "#6b7280",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  heatmapSection: {
    marginTop: 8
  },
  heatmapGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(53, 12px)",
    gap: 4,
    alignItems: "center"
  },
  heatmapCell: {
    width: 12,
    height: 12,
    borderRadius: 3,
    border: "1px solid rgba(0,0,0,0.04)"
  },
  legend: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    justifyContent: "flex-end",
    marginTop: 16
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 3
  },
  legendText: {
    color: "#6b7280",
    fontSize: 12
  },
  leaderboardText: {
    color: "#6b7280",
    lineHeight: 1.6,
    marginBottom: 16
  },
  leaderboardList: {
    display: "flex",
    flexDirection: "column",
    gap: 12
  },
  leaderboardRow: {
    display: "grid",
    gridTemplateColumns: "28px 48px 1fr 52px 40px",
    gap: 10,
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 14,
    background: "#f9fafb"
  },
  leaderboardRowActive: {
    border: "1px solid #86efac",
    background: "#ecfdf5"
  },
  leaderboardRank: {
    color: "#6b7280",
    fontWeight: 700
  },
  leaderboardName: {
    color: "#111827",
    fontWeight: 700
  },
  leaderboardBarWrap: {
    height: 8,
    borderRadius: 999,
    background: "#e5e7eb",
    overflow: "hidden"
  },
  leaderboardBar: {
    height: "100%",
    borderRadius: 999,
    background: "#111827"
  },
  leaderboardScore: {
    color: "#111827",
    fontWeight: 700,
    textAlign: "right"
  },
  leaderboardDelta: {
    color: "#16a34a",
    fontWeight: 700,
    textAlign: "right"
  }
};