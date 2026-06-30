from pathlib import Path
import json
import warnings

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_recall_fscore_support,
)
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, MinMaxScaler
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression


warnings.filterwarnings("ignore")


ML_DIR = Path(__file__).resolve().parent
DATA_DIR = ML_DIR / "data"
MODELS_DIR = ML_DIR / "models"

MODELS_DIR.mkdir(parents=True, exist_ok=True)

DATASET_PATH = DATA_DIR / "jobs_ml_dataset.csv"
MODEL_PATH = MODELS_DIR / "job_category_model.pkl"
METRICS_PATH = MODELS_DIR / "model_metrics.json"
CONFUSION_MATRIX_PATH = MODELS_DIR / "confusion_matrix.png"

FINAL_MODEL_NAME = "Gradient Boosting"


def load_dataset():
    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Nu există {DATASET_PATH}. Rulează întâi export_jobs_dataset.py."
        )

    df = pd.read_csv(DATASET_PATH)

    required_columns = [
        "text_features", 
        "work_mode",
        "employment_type",
        "seniority",
        "category",
    ]

    missing = [column for column in required_columns if column not in df.columns]

    if missing:
        raise ValueError(f"Lipsesc coloanele obligatorii: {missing}")

    df["text_features"] = df["text_features"].fillna("")
    df["work_mode"] = df["work_mode"].fillna("UNKNOWN")
    df["employment_type"] = df["employment_type"].fillna("UNKNOWN")
    df["seniority"] = df["seniority"].fillna("UNKNOWN")
    df["category"] = df["category"].astype(str)

    return df


def build_preprocessor():
    return ColumnTransformer(
        transformers=[
            (
                "text",
                TfidfVectorizer(
                    lowercase=True,
                    stop_words="english",
                    ngram_range=(1, 2),
                    min_df=1,
                    max_features=500,
                ),
                "text_features",
            ),
            (
                "categorical",
                OneHotEncoder(handle_unknown="ignore"),
                ["work_mode", "employment_type", "seniority"],
            ),
            
        ]
    )


def build_models():
    return {
        "Logistic Regression": LogisticRegression(
            max_iter=1000,
            class_weight="balanced",
            random_state=42,
        ),
        "Naive Bayes": MultinomialNB(),
        "Decision Tree": DecisionTreeClassifier(
            max_depth=5,
            min_samples_leaf=2,
            random_state=42,
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=100,
            max_depth=6,
            min_samples_leaf=2,
            class_weight="balanced",
            random_state=42,
        ),
        "Gradient Boosting": GradientBoostingClassifier(
            n_estimators=80,
            learning_rate=0.08,
            max_depth=3,
            random_state=42,
        ),
    }


def build_pipeline(model):
    return Pipeline(
        steps=[
            ("preprocessor", build_preprocessor()),
            ("model", model),
        ]
    )


def evaluate_model(name, pipeline, x_train, x_test, y_train, y_test):
    pipeline.fit(x_train, y_train)

    y_pred = pipeline.predict(x_test)
    accuracy = accuracy_score(y_test, y_pred)

    macro_precision, macro_recall, macro_f1, _ = precision_recall_fscore_support(
        y_test,
        y_pred,
        average="macro",
        zero_division=0,
    )

    weighted_precision, weighted_recall, weighted_f1, _ = precision_recall_fscore_support(
        y_test,
        y_pred,
        average="weighted",
        zero_division=0,
    )

    return {
        "model": name,
        "accuracy": round(float(accuracy), 4),
        "macro_precision": round(float(macro_precision), 4),
        "macro_recall": round(float(macro_recall), 4),
        "macro_f1": round(float(macro_f1), 4),
        "weighted_precision": round(float(weighted_precision), 4),
        "weighted_recall": round(float(weighted_recall), 4),
        "weighted_f1": round(float(weighted_f1), 4),
        "classification_report": classification_report(
            y_test,
            y_pred,
            zero_division=0,
            output_dict=True,
        ),
        "y_pred": y_pred.tolist(),
    }


def save_confusion_matrix(y_test, y_pred, labels):
    cm = confusion_matrix(y_test, y_pred, labels=labels)

    fig, ax = plt.subplots(figsize=(10, 8))
    image = ax.imshow(cm)

    ax.set_title("Confusion Matrix - Job Category Classification")
    ax.set_xlabel("Predicted category")
    ax.set_ylabel("True category")

    ax.set_xticks(np.arange(len(labels)))
    ax.set_yticks(np.arange(len(labels)))
    ax.set_xticklabels(labels, rotation=45, ha="right")
    ax.set_yticklabels(labels)

    for i in range(len(labels)):
        for j in range(len(labels)):
            ax.text(j, i, cm[i, j], ha="center", va="center")

    fig.colorbar(image)
    fig.tight_layout()
    fig.savefig(CONFUSION_MATRIX_PATH, dpi=160)
    plt.close(fig)

    return CONFUSION_MATRIX_PATH


def extract_feature_importance(pipeline, top_n=25):
    model = pipeline.named_steps["model"]

    if not hasattr(model, "feature_importances_"):
        return []

    preprocessor = pipeline.named_steps["preprocessor"]
    feature_names = preprocessor.get_feature_names_out()
    importances = model.feature_importances_

    ranked = sorted(
        zip(feature_names, importances),
        key=lambda item: item[1],
        reverse=True,
    )

    return [
        {
            "feature": feature,
            "importance": round(float(importance), 6),
        }
        for feature, importance in ranked[:top_n]
        if importance > 0
    ]


def main():
    df = load_dataset()

    x = df[
        [
            "text_features",
            "work_mode",
            "employment_type",
            "seniority",
            "difficulty_score",
        ]
    ]

    y = df["category"]

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.25,
        random_state=42,
        stratify=y,
    )

    models = build_models()
    results = []
    fitted_pipelines = {}

    print("Antrenare modele...\n")

    for name, model in models.items():
        pipeline = build_pipeline(model)

        result = evaluate_model(
            name,
            pipeline,
            x_train,
            x_test,
            y_train,
            y_test,
        )

        results.append(result)
        fitted_pipelines[name] = pipeline

        print(
            f"{name}: "
            f"accuracy={result['accuracy']} | "
            f"macro_f1={result['macro_f1']}"
        )

    if FINAL_MODEL_NAME not in fitted_pipelines:
        raise ValueError(f"Modelul final {FINAL_MODEL_NAME} nu există.")

    final_pipeline = fitted_pipelines[FINAL_MODEL_NAME]
    final_result = next(
        result for result in results if result["model"] == FINAL_MODEL_NAME
    )

    labels = sorted(y.unique().tolist())

    confusion_matrix_path = save_confusion_matrix(
        y_test,
        final_result["y_pred"],
        labels,
    )

    feature_importance = extract_feature_importance(final_pipeline)

    joblib.dump(final_pipeline, MODEL_PATH)

    clean_results = []

    for result in results:
        result_copy = dict(result)
        result_copy.pop("y_pred", None)
        clean_results.append(result_copy)

    metrics = {
        "problem_type": "multiclass_classification",
        "target": "category",
        "features": [
            "text_features",
            "work_mode",
            "employment_type",
            "seniority",
            "difficulty_score",
        ],
        "dataset_size": int(len(df)),
        "train_size": int(len(x_train)),
        "test_size": int(len(x_test)),
        "labels": labels,
        "tested_models": clean_results,
        "best_model": {
            "name": FINAL_MODEL_NAME,
            "accuracy": final_result["accuracy"],
            "macro_precision": final_result["macro_precision"],
            "macro_recall": final_result["macro_recall"],
            "macro_f1": final_result["macro_f1"],
            "weighted_f1": final_result["weighted_f1"],
        },
        "feature_importance": feature_importance,
        "artifacts": {
            "model_path": str(MODEL_PATH),
            "metrics_path": str(METRICS_PATH),
            "confusion_matrix_path": str(confusion_matrix_path),
        },
        "methodology_note": (
            "Modelul a fost antrenat ca problemă de clasificare multiclasă. "
            "Descrierile joburilor au fost transformate prin TF-IDF, variabilele "
            "categorice au fost codificate, iar modelele au fost evaluate prin "
            "Accuracy, Precision, Recall și F1-score. Modelul final integrat în "
            "aplicație este Gradient Boosting."
        ),
    }

    with open(METRICS_PATH, "w", encoding="utf-8") as file:
        json.dump(metrics, file, ensure_ascii=False, indent=2)

    print("\nAntrenare finalizată.")
    print(f"Model final: {FINAL_MODEL_NAME}")
    print(f"Model salvat în: {MODEL_PATH}")
    print(f"Metrici salvate în: {METRICS_PATH}")
    print(f"Matrice confuzie: {confusion_matrix_path}")


if __name__ == "__main__":
    main()