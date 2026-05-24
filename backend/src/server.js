require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const db = require("./config/db");

const authRoutes = require("./routes/auth.routes");
const jobsRoutes = require("./routes/jobs.routes");
const userSkillsRoutes = require("./routes/userSkills.routes");
const skillsRoutes = require("./routes/skills.routes");
const cvRoutes = require("./routes/cv.routes");
const roadmapsRoutes = require("./routes/roadmaps.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const userRoutes = require("./routes/user.routes");
const mlRoutes = require("./routes/ml.routes");
const profileRoutes = require("./routes/profile.routes");

const app = express();

const PORT = Number(process.env.PORT) || 5050;

app.use(helmet());

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175"
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).json({
    ok: true,
    message: "SkillTrack API running"
  });
});

app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS test");

    res.status(200).json({
      ok: true,
      db: "connected",
      rows
    });
  } catch (err) {
    console.error("DB error:", err);

    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/user-skills", userSkillsRoutes);
app.use("/api/skills", skillsRoutes);
app.use("/api/cv", cvRoutes);
app.use("/api/roadmaps", roadmapsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/user", userRoutes);
app.use("/api/ml", mlRoutes);
app.use("/api/profile", profileRoutes);

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "Ruta nu a fost găsită."
  });
});

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);

  res.status(500).json({
    ok: false,
    error: "Eroare internă de server."
  });
});

async function startServer() {
  try {
    await db.query("SELECT 1");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log("✅ DB connected");
    });
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  }
}

startServer();