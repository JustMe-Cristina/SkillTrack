from pathlib import Path
import json
import sys

import joblib
import pandas as pd


ML_DIR = Path(__file__).resolve().parent
MODEL_PATH = ML_DIR / "models" / "job_category_model.pkl"
METRICS_PATH = ML_DIR / "models" / "model_metrics.json"


def normalize_input(payload):
    title = payload.get("title") or ""
    description = payload.get("description") or ""
    skills = payload.get("skills") or []
    technologies = payload.get("technologies") or []

    if isinstance(skills, list):
        skills_text = " ".join(str(skill) for skill in skills)
    else:
        skills_text = str(skills)

    if isinstance(technologies, list):
        technologies_text = " ".join(str(tech) for tech in technologies)
    else:
        technologies_text = str(technologies)

    text_features = f"{title} {description} {skills_text} {technologies_text}"

    return pd.DataFrame(
        [
            {
                "text_features": text_features,
                "work_mode": payload.get("work_mode") or "UNKNOWN",
                "employment_type": payload.get("employment_type") or "UNKNOWN",
                "seniority": payload.get("seniority") or "UNKNOWN",
                "difficulty_score": payload.get("difficulty_score") or 0,
            }
        ]
    )


def main():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            "Modelul ML nu există. Rulează întâi train_job_category_model.py."
        )

    raw_input = sys.stdin.read()

    if not raw_input.strip():
        raise ValueError("Nu a fost primit niciun payload JSON.")

    payload = json.loads(raw_input)

    model = joblib.load(MODEL_PATH)
    input_df = normalize_input(payload)

    predicted_category = model.predict(input_df)[0]

    probabilities = []

    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(input_df)[0]
        classes = model.classes_

        probabilities = [
            {
                "category": str(category),
                "probability": round(float(prob), 4),
            }
            for category, prob in zip(classes, proba)
        ]

        probabilities.sort(key=lambda item: item["probability"], reverse=True)

    metrics = {}

    if METRICS_PATH.exists():
        with open(METRICS_PATH, "r", encoding="utf-8") as file:
            metrics = json.load(file)

    result = {
        "ok": True,
        "predictedCategory": str(predicted_category),
        "probabilities": probabilities,
        "model": metrics.get("best_model", {}).get("name"),
        "problemType": metrics.get("problem_type"),
        "target": metrics.get("target"),
    }

    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": str(exc),
                },
                ensure_ascii=False,
            )
        )
        sys.exit(1)
