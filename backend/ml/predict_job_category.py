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


def load_metrics():
    if not METRICS_PATH.exists():
        return {}

    with open(METRICS_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def predict_category(payload):
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            "Modelul ML nu există. Rulează întâi train_job_category_model.py."
        )

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
                "probability": round(float(probability), 4),
            }
            for category, probability in zip(classes, proba)
        ]

        probabilities.sort(key=lambda item: item["probability"], reverse=True)

    metrics = load_metrics()
    final_model = metrics.get("best_model", {})

    return {
        "ok": True,
        "predictedCategory": str(predicted_category),
        "probabilities": probabilities,
        "confidence": probabilities[0]["probability"] if probabilities else None,
        "model": final_model.get("name") or "Gradient Boosting",
        "problemType": metrics.get("problem_type") or "multiclass_classification",
        "target": metrics.get("target") or "category",
    }


def main():
    raw_input = sys.stdin.read()

    if not raw_input.strip():
      raise ValueError("Nu a fost primit niciun payload JSON.")

    payload = json.loads(raw_input)
    result = predict_category(payload)

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