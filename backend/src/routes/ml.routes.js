const express = require("express");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const auth = require("../middleware/auth.middleware");

const router = express.Router();

function getPythonCommand() {
  const localVenvPython = path.join(
    __dirname,
    "../../../.venv/bin/python"
  );

  if (fs.existsSync(localVenvPython)) {
    return localVenvPython;
  }

  return process.platform === "win32" ? "python" : "python3";
}

function runPython(scriptPath, payload) {
  return new Promise((resolve, reject) => {
    const python = spawn(getPythonCommand(), [scriptPath], {
      cwd: path.dirname(scriptPath)
    });

    let stdout = "";
    let stderr = "";

    python.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    python.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    python.on("error", reject);

    python.stdin.write(JSON.stringify(payload));
    python.stdin.end();

    python.on("close", (code) => {
      if (code !== 0) {
        return reject(
          new Error(stderr.trim() || stdout.trim() || "Python process failed.")
        );
      }

      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error("Invalid JSON returned by Python script."));
      }
    });
  });
}

router.get("/job-category/metrics", auth, async (req, res) => {
  try {
    const metricsPath = path.join(
      __dirname,
      "../../ml/models/model_metrics.json"
    );

    if (!fs.existsSync(metricsPath)) {
      return res.status(404).json({
        ok: false,
        error:
          "Metricile modelului ML nu există. Rulează întâi train_job_category_model.py."
      });
    }

    const metrics = JSON.parse(fs.readFileSync(metricsPath, "utf8"));

    return res.json({
      ok: true,
      metrics
    });
  } catch (err) {
    console.error("ML METRICS ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error"
    });
  }
});

router.post("/job-category/predict", auth, async (req, res) => {
  try {
    const payload = {
      title: req.body.title || "",
      description: req.body.description || "",
      skills: Array.isArray(req.body.skills) ? req.body.skills : [],
      technologies: Array.isArray(req.body.technologies)
        ? req.body.technologies
        : [],
      work_mode: req.body.work_mode || "UNKNOWN",
      employment_type: req.body.employment_type || "UNKNOWN",
      seniority: req.body.seniority || "UNKNOWN",
      difficulty_score: Number(req.body.difficulty_score) || 0
    };

    if (!payload.title && !payload.description) {
      return res.status(400).json({
        ok: false,
        error: "Trimite cel puțin titlu sau descriere pentru predicție."
      });
    }

    const scriptPath = path.join(
      __dirname,
      "../../ml/predict_job_category.py"
    );

    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({
        ok: false,
        error: "Scriptul predict_job_category.py nu există."
      });
    }

    const result = await runPython(scriptPath, payload);

    if (!result.ok) {
      return res.status(500).json(result);
    }

    return res.json({
      ok: true,
      prediction: result
    });
  } catch (err) {
    console.error("ML PREDICT ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: err.message || "Predicția ML a eșuat."
    });
  }
});

module.exports = router;