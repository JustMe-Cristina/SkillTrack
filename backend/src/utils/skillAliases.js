const skillAliases = {
  // ── Data ─────────────────────────────────────────────────────────
  "SQL": [
    "sql", "structured query language", "queries", "database queries",
    "microsoft sql", "ms sql", "t-sql", "tsql", "sql server",
    "stored procedures", "sql queries"
  ],
  "Python": [
    "python", "python3", "python 3", "scripting", "automation scripts",
    "python code", "python scripting"
  ],
  "Power BI": [
    "power bi", "powerbi", "power-bi", "bi dashboards",
    "power bi reports", "power bi dashboards"
  ],
  "Tableau": [
    "tableau", "tableau dashboards", "tableau reports"
  ],
  "Excel": [
    "excel", "microsoft excel", "spreadsheets", "ms excel"
  ],
  "Data Analysis": [
    "data analysis", "data analytics", "data analyst",
    "analiza datelor", "analiză de date", "analiza de date",
    "data cleaning", "analyze data", "analyzing data",
    "actionable insights", "data insights", "transforming data",
    "raw data", "data processing"
  ],
  "Data Visualization": [
    "data visualization", "data visualisation", "dashboards",
    "reports and dashboards", "visualizations", "charts",
    "data reporting", "reporting"
  ],
  "Statistical Analysis": [
    "statistical analysis", "statistics", "statistică", "statistica",
    "statistical modeling", "regression", "hypothesis testing"
  ],
  "Data Mining": [
    "data mining", "mining data", "pattern recognition"
  ],
  "Data Preprocessing": [
    "data preprocessing", "data preparation", "data wrangling",
    "data cleaning", "data transformation", "etl", "extract transform load",
    "data quality", "data integrity"
  ],
  "Machine Learning": [
    "machine learning", "ml", "model training", "predictive modeling",
    "supervised learning", "classification", "regression models"
  ],
  "Artificial Intelligence": [
    "artificial intelligence", "ai", "deep learning", "neural networks"
  ],
  "Large Language Models": [
    "large language models", "llm", "llms", "gpt", "generative ai",
    "natural language processing", "nlp"
  ],
  "ETL": [
    "etl", "extract transform load", "data pipelines", "data flows",
    "data ingestion", "data warehousing", "data warehouse", "dwh"
  ],
  "Data Modeling": [
    "data modeling", "data modelling", "data model", "data structures",
    "database design", "schema design", "master data", "metadata"
  ],
  "Microsoft SQL Server": [
    "microsoft sql server", "ms sql server", "sql server", "ssms",
    "microsoft sql", "mssql", "ssrs", "ssis"
  ],

  // ── ML ───────────────────────────────────────────────────────────
  "NumPy": ["numpy", "numpy arrays", "numerical python"],
  "Pandas": ["pandas", "dataframes", "pandas dataframe"],
  "PySpark": ["pyspark", "apache spark", "spark"],
  "Seaborn": ["seaborn", "matplotlib", "data plotting"],
  "Cloud Computing": [
    "cloud computing", "cloud", "cloud services", "cloud platforms"
  ],

  // ── DevOps ───────────────────────────────────────────────────────
  "Docker": ["docker", "containerization", "containers", "docker containers"],
  "Git": [
    "git", "version control", "source control", "github", "gitlab",
    "bitbucket", "git version control"
  ],
  "Azure": [
    "azure", "microsoft azure", "azure cloud", "azure services"
  ],
  "Bitbucket": ["bitbucket"],
  "Version Control": [
    "version control", "source control", "versioning"
  ],
  "PowerShell": [
    "powershell", "power shell", "ps scripts", "windows scripting"
  ],
  "Bash": [
    "bash", "bash scripting", "shell scripting", "linux scripting",
    "shell scripts", "unix scripting"
  ],

  // ── Dev ──────────────────────────────────────────────────────────
  "JavaScript": [
    "javascript", "js", "java script", "ecmascript", "vanilla js"
  ],
  "React": ["react", "reactjs", "react.js"],
  "Node.js": [
    "node", "node.js", "nodejs", "express", "express.js"
  ],
  "CSS": ["css", "css3", "styling", "stylesheets"],
  "HTML": ["html", "html5", "markup"],
  "REST APIs": [
    "rest api", "rest apis", "api", "apis", "web services",
    "restful", "restful api", "http api", "api integration",
    "api development"
  ],
  "MongoDB": ["mongodb", "mongo", "document database", "nosql database"],
  "Object Oriented Programming": [
    "object oriented programming", "oop", "object oriented",
    "object-oriented", "classes and objects", "inheritance",
    "encapsulation", "polymorphism"
  ],
  "NoSQL": [
    "nosql", "no-sql", "non-relational", "document store",
    "key-value store", "nosql databases"
  ],
  "MySQL": ["mysql", "my sql"],
  "Oracle": ["oracle", "oracle db", "oracle database", "pl/sql", "plsql"],
  "PostgreSQL": ["postgresql", "postgres", "psql"],

  // ── Business ─────────────────────────────────────────────────────
  "Excel": [
    "excel", "microsoft excel", "spreadsheets", "ms excel",
    "pivot tables", "vlookup", "advanced excel"
  ],
  "Business Analysis": [
    "business analysis", "analiză de business", "analiza de business",
    "business analyst", "requirements gathering", "business requirements",
    "stakeholder management", "kpi", "kpis", "business acumen",
    "business insights"
  ],

  // ── Algoritmi ────────────────────────────────────────────────────
  "Algorithms and Data Structures": [
    "algorithms", "data structures", "algorithm design",
    "complexity", "sorting algorithms", "search algorithms"
  ],
};

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function textContainsAlias(text, alias) {
  const escaped = escapeRegex(alias.trim());
  const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, "i");
  return regex.test(text);
}

function skillMatchesText(skillName, text) {
  const normalizedText = String(text || "").toLowerCase().trim();
  const aliases = skillAliases[skillName] || [skillName.toLowerCase()];

  if (!normalizedText) return false;

  return aliases.some((alias) =>
    textContainsAlias(normalizedText, alias.toLowerCase())
  );
}

module.exports = {
  skillAliases,
  skillMatchesText
};