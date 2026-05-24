from pathlib import Path
import json
import os

import mysql.connector
import pandas as pd
from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[1]
ML_DIR = Path(__file__).resolve().parent
DATA_DIR = ML_DIR / "data"

DATA_DIR.mkdir(parents=True, exist_ok=True)

load_dotenv(BACKEND_DIR / ".env")


def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "8889")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", "root"),
        database=os.getenv("DB_NAME", "skilltrack"),
    )


def parse_technologies(value):
    if value is None:
        return ""

    if isinstance(value, list):
        return " ".join(value)

    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return " ".join(str(item) for item in parsed)
    except Exception:
        pass

    return str(value)


def main():
    connection = get_db_connection()

    query = """
        SELECT
            j.id,
            j.title,
            j.company,
            j.location,
            j.work_mode,
            j.employment_type,
            j.seniority,
            j.category,
            j.difficulty_score,
            j.description,
            j.technologies_json,
            GROUP_CONCAT(DISTINCT s.name ORDER BY s.name SEPARATOR ', ') AS skills
        FROM jobs j
        LEFT JOIN job_skills js ON js.job_id = j.id
        LEFT JOIN skills s ON s.id = js.skill_id
        WHERE j.category IS NOT NULL
        GROUP BY
            j.id,
            j.title,
            j.company,
            j.location,
            j.work_mode,
            j.employment_type,
            j.seniority,
            j.category,
            j.difficulty_score,
            j.description,
            j.technologies_json
        ORDER BY j.id;
    """

    df = pd.read_sql(query, connection)
    connection.close()

    if df.empty:
        raise ValueError("Nu există joburi cu category în baza de date.")

    df["skills"] = df["skills"].fillna("")
    df["technologies"] = df["technologies_json"].apply(parse_technologies)

    df["text_features"] = (
        df["title"].fillna("")
        + " "
        + df["description"].fillna("")
        + " "
        + df["skills"].fillna("")
        + " "
        + df["technologies"].fillna("")
    )

    output_path = DATA_DIR / "jobs_ml_dataset.csv"
    df.to_csv(output_path, index=False)

    print("✅ Dataset ML exportat cu succes.")
    print(f"Fișier: {output_path}")
    print(f"Număr joburi: {len(df)}")
    print("\nDistribuție categorii:")
    print(df["category"].value_counts())


if __name__ == "__main__":
    main()
