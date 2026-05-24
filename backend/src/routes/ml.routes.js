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

  return "python3";
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

    const raw = fs.readFileSync(metricsPath, "utf8");
    const metrics = JSON.parse(raw);

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
      skills: req.body.skills || [],
      technologies: req.body.technologies || [],
      work_mode: req.body.work_mode || "UNKNOWN",
      employment_type: req.body.employment_type || "UNKNOWN",
      seniority: req.body.seniority || "UNKNOWN",
      difficulty_score: req.body.difficulty_score || 0
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

    const pythonCommand = getPythonCommand();

    const pythonProcess = spawn(pythonCommand, [scriptPath], {
      cwd: path.join(__dirname, "../../ml")
    });

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    pythonProcess.stdin.write(JSON.stringify(payload));
    pythonProcess.stdin.end();

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error("ML PREDICT STDERR:", stderr);
        console.error("ML PREDICT STDOUT:", stdout);

        return res.status(500).json({
          ok: false,
          error: "Predicția ML a eșuat.",
          details: stderr || stdout
        });
      }

      try {
        const result = JSON.parse(stdout);

        if (!result.ok) {
          return res.status(500).json(result);
        }

        return res.json({
          ok: true,
          prediction: result
        });
      } catch (parseError) {
        console.error("ML PREDICT PARSE ERROR:", parseError);
        console.error("Raw stdout:", stdout);

        return res.status(500).json({
          ok: false,
          error: "Răspuns invalid de la scriptul ML."
        });
      }
    });
  } catch (err) {
    console.error("ML PREDICT ROUTE ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error"
    });
  }
});

module.exports = router;