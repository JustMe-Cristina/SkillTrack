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

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: false
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/user-skills", userSkillsRoutes);
app.use("/api/skills", skillsRoutes);
app.use("/api/cv", cvRoutes);
app.use("/api/roadmaps", roadmapsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/user", userRoutes);

app.get("/", (req, res) => {
  res.status(200).json({ ok: true, message: "SkillTrack API running" });
});

app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS test");
    res.status(200).json({ ok: true, db: "connected", rows });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});