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
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.naive_bayes import MultinomialNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, MinMaxScaler
from sklearn.tree import DecisionTreeClassifier, plot_tree
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression


warnings.filterwarnings("ignore")


ML_DIR = Path(__file__).resolve().parent
DATA_DIR = ML_DIR / "data"
MODELS_DIR = ML_DIR / "models"

MODELS_DIR.mkdir(parents=True, exist_ok=True)

DATASET_PATH = DATA_DIR / "jobs_ml_dataset.csv"


def load_dataset():
    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Nu există {DATASET_PATH}. Rulează întâi export_jobs_dataset.py"
        )

    df = pd.read_csv(DATASET_PATH)

    required_columns = [
        "text_features",
        "work_mode",
        "employment_type",
        "seniority",
        "difficulty_score",
        "category",
    ]

    missing = [column for column in required_columns if column not in df.columns]
    if missing:
        raise ValueError(f"Lipsesc coloanele: {missing}")

    df["text_features"] = df["text_features"].fillna("")
    df["work_mode"] = df["work_mode"].fillna("UNKNOWN")
    df["employment_type"] = df["employment_type"].fillna("UNKNOWN")
    df["seniority"] = df["seniority"].fillna("UNKNOWN")
    df["difficulty_score"] = df["difficulty_score"].fillna(0)

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
            (
                "numeric",
                MinMaxScaler(),
                ["difficulty_score"],
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
        "KNN": KNeighborsClassifier(n_neighbors=3),
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

    try:
        cv_scores = cross_val_score(
            pipeline,
            pd.concat([x_train, x_test]),
            pd.concat([y_train, y_test]),
            cv=3,
            scoring="f1_macro",
        )
        cv_macro_f1 = float(np.mean(cv_scores))
    except Exception:
        cv_macro_f1 = None

    return {
        "model": name,
        "accuracy": round(float(accuracy), 4),
        "macro_precision": round(float(macro_precision), 4),
        "macro_recall": round(float(macro_recall), 4),
        "macro_f1": round(float(macro_f1), 4),
        "weighted_precision": round(float(weighted_precision), 4),
        "weighted_recall": round(float(weighted_recall), 4),
        "weighted_f1": round(float(weighted_f1), 4),
        "cv_macro_f1": round(cv_macro_f1, 4) if cv_macro_f1 is not None else None,
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

    output_path = MODELS_DIR / "confusion_matrix.png"
    fig.savefig(output_path, dpi=160)
    plt.close(fig)

    return output_path


def save_decision_tree_plot(best_pipeline, labels):
    model = best_pipeline.named_steps["model"]

    if not isinstance(model, DecisionTreeClassifier):
        return None

    preprocessor = best_pipeline.named_steps["preprocessor"]
    feature_names = preprocessor.get_feature_names_out()

    fig, ax = plt.subplots(figsize=(24, 12))

    plot_tree(
        model,
        feature_names=feature_names,
        class_names=labels,
        filled=True,
        rounded=True,
        fontsize=7,
        max_depth=3,
        ax=ax,
    )

    output_path = MODELS_DIR / "decision_tree_preview.png"
    fig.tight_layout()
    fig.savefig(output_path, dpi=160)
    plt.close(fig)

    return output_path


def extract_feature_importance(best_pipeline, top_n=25):
    model = best_pipeline.named_steps["model"]

    if not hasattr(model, "feature_importances_"):
        return []

    preprocessor = best_pipeline.named_steps["preprocessor"]
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

    print("🔎 Antrenare modele...\n")

    for name, model in models.items():
        pipeline = Pipeline(
            steps=[
                ("preprocessor", build_preprocessor()),
                ("model", model),
            ]
        )

        result = evaluate_model(name, pipeline, x_train, x_test, y_train, y_test)
        results.append(result)
        fitted_pipelines[name] = pipeline

        print(
            f"{name}: "
            f"accuracy={result['accuracy']} | "
            f"macro_f1={result['macro_f1']} | "
            f"cv_macro_f1={result['cv_macro_f1']}"
        )

    best_result = sorted(
        results,
        key=lambda item: (
            item["macro_f1"],
            item["accuracy"],
        ),
        reverse=True,
    )[0]

    best_model_name = best_result["model"]
    best_pipeline = fitted_pipelines[best_model_name]

    labels = sorted(y.unique().tolist())

    confusion_matrix_path = save_confusion_matrix(
        y_test,
        best_result["y_pred"],
        labels,
    )

    tree_plot_path = save_decision_tree_plot(best_pipeline, labels)
    feature_importance = extract_feature_importance(best_pipeline)

    model_path = MODELS_DIR / "job_category_model.pkl"
    metrics_path = MODELS_DIR / "model_metrics.json"

    joblib.dump(best_pipeline, model_path)

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
            "name": best_model_name,
            "accuracy": best_result["accuracy"],
            "macro_precision": best_result["macro_precision"],
            "macro_recall": best_result["macro_recall"],
            "macro_f1": best_result["macro_f1"],
            "weighted_f1": best_result["weighted_f1"],
            "cv_macro_f1": best_result["cv_macro_f1"],
        },
        "feature_importance": feature_importance,
        "artifacts": {
            "model_path": str(model_path),
            "metrics_path": str(metrics_path),
            "confusion_matrix_path": str(confusion_matrix_path),
            "decision_tree_preview_path": str(tree_plot_path)
            if tree_plot_path
            else None,
        },
        "methodology_note": (
            "Modelul a fost antrenat ca problemă de clasificare multiclasă, "
            "folosind train/test split, vectorizare TF-IDF pentru text, "
            "encoding pentru variabile categorice și evaluare prin accuracy, "
            "precision, recall și F1-score."
        ),
    }

    with open(metrics_path, "w", encoding="utf-8") as file:
        json.dump(metrics, file, ensure_ascii=False, indent=2)

    print("\n✅ Antrenare finalizată.")
    print(f"Cel mai bun model: {best_model_name}")
    print(f"Model salvat în: {model_path}")
    print(f"Metrici salvate în: {metrics_path}")
    print(f"Confusion matrix: {confusion_matrix_path}")

    if tree_plot_path:
        print(f"Arbore decizie preview: {tree_plot_path}")


if __name__ == "__main__":
    main()
