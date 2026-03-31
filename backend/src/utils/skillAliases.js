const skillAliases = {
  // ── Data ─────────────────────────────────────────────────────────
  SQL: [
    "sql",
    "structured query language",
    "database queries",
    "sql queries",
    "stored procedures"
  ],
  Python: [
    "python",
    "python3",
    "python 3",
    "python code",
    "python scripting",
    "automation scripts"
  ],
  "Power BI": [
    "power bi",
    "powerbi",
    "power-bi",
    "power bi reports",
    "power bi dashboards",
    "dax",
    "power query"
  ],
  Tableau: [
    "tableau",
    "tableau dashboards",
    "tableau reports"
  ],
  Excel: [
    "excel",
    "microsoft excel",
    "spreadsheets",
    "ms excel",
    "pivot tables",
    "vlookup",
    "advanced excel"
  ],
  "Data Analysis": [
    "data analysis",
    "data analytics",
    "data analyst",
    "analiza datelor",
    "analiză de date",
    "analiza de date",
    "analyze data",
    "analyzing data",
    "actionable insights",
    "data insights",
    "transforming data",
    "raw data",
    "data processing"
  ],
  "Data Visualization": [
    "data visualization",
    "data visualisation",
    "visualizations",
    "charts",
    "dashboards",
    "reports and dashboards",
    "data reporting"
  ],
  "Statistical Analysis": [
    "statistical analysis",
    "statistics",
    "statistică",
    "statistica",
    "statistical modeling",
    "regression",
    "hypothesis testing"
  ],
  "Data Mining": [
    "data mining",
    "mining data",
    "pattern recognition"
  ],
  "Data Preprocessing": [
    "data preprocessing",
    "data preparation",
    "data wrangling",
    "data cleaning",
    "data transformation",
    "data quality",
    "data integrity",
    "feature scaling",
    "data normalization"
  ],
  "Machine Learning": [
    "machine learning",
    "model training",
    "predictive modeling",
    "supervised learning",
    "classification",
    "regression models"
  ],
  "Artificial Intelligence": [
    "artificial intelligence",
    "deep learning",
    "neural networks"
  ],
  "Large Language Models": [
    "large language models",
    "llm",
    "llms",
    "gpt",
    "generative ai",
    "natural language processing",
    "nlp"
  ],
  ETL: [
    "etl",
    "extract transform load",
    "extract-transform-load",
    "data pipelines",
    "data flows",
    "data ingestion",
    "pipeline orchestration"
  ],
  "Data Modeling": [
    "data modeling",
    "data modelling",
    "data model",
    "database design",
    "schema design",
    "master data",
    "metadata"
  ],
  "Microsoft SQL Server": [
    "microsoft sql server",
    "ms sql server",
    "sql server",
    "mssql",
    "ssms",
    "ssis",
    "ssrs",
    "t-sql",
    "tsql",
    "transact-sql"
  ],

  // ── ML ───────────────────────────────────────────────────────────
  NumPy: [
    "numpy",
    "numpy arrays",
    "numerical python"
  ],
  Pandas: [
    "pandas",
    "dataframes",
    "pandas dataframe"
  ],
  PySpark: [
    "pyspark",
    "apache spark",
    "spark"
  ],
  Seaborn: [
    "seaborn"
  ],
  "Cloud Computing": [
    "cloud computing",
    "cloud services",
    "cloud platforms"
  ],

  // ── DevOps ───────────────────────────────────────────────────────
  Docker: [
    "docker",
    "containerization",
    "containers",
    "docker containers"
  ],
  Git: [
    "git",
    "version control",
    "source control",
    "git version control",
    "github",
    "gitlab"
  ],
  Azure: [
    "azure",
    "microsoft azure",
    "azure cloud",
    "azure services"
  ],
  Bitbucket: [
    "bitbucket"
  ],
  "Version Control": [
    "versioning"
  ],
  PowerShell: [
    "powershell",
    "power shell",
    "ps scripts",
    "windows scripting"
  ],
  Bash: [
    "bash",
    "bash scripting",
    "shell scripting",
    "linux scripting",
    "shell scripts",
    "unix scripting"
  ],

  // ── Dev ──────────────────────────────────────────────────────────
  JavaScript: [
    "javascript",
    "js",
    "java script",
    "ecmascript",
    "vanilla js"
  ],
  React: [
    "react",
    "reactjs",
    "react.js"
  ],
  "Node.js": [
    "node",
    "node.js",
    "nodejs",
    "express",
    "express.js"
  ],
  CSS: [
    "css",
    "css3",
    "stylesheets"
  ],
  HTML: [
    "html",
    "html5"
  ],
  "REST APIs": [
    "rest api",
    "rest apis",
    "web services",
    "restful",
    "restful api",
    "http api",
    "api integration",
    "api development"
  ],
  MongoDB: [
    "mongodb",
    "mongo",
    "document database",
    "nosql database"
  ],
  "Object Oriented Programming": [
    "object oriented programming",
    "oop",
    "object oriented",
    "object-oriented",
    "classes and objects",
    "inheritance",
    "encapsulation",
    "polymorphism"
  ],
  NoSQL: [
    "nosql",
    "no-sql",
    "non-relational",
    "document store",
    "key-value store",
    "nosql databases"
  ],
  MySQL: [
    "mysql",
    "my sql"
  ],
  Oracle: [
    "oracle",
    "oracle db",
    "oracle database",
    "pl/sql",
    "plsql"
  ],
  PostgreSQL: [
    "postgresql",
    "postgres",
    "psql"
  ],

  // ── Business ─────────────────────────────────────────────────────
  "Business Analysis": [
    "business analysis",
    "analiză de business",
    "analiza de business",
    "business analyst",
    "requirements gathering",
    "business requirements",
    "stakeholder management",
    "kpi",
    "kpis",
    "business acumen",
    "business insights"
  ],

  // ── Algoritmi ────────────────────────────────────────────────────
  "Algorithms and Data Structures": [
    "algorithms",
    "data structures",
    "algorithm design",
    "complexity",
    "sorting algorithms",
    "search algorithms"
  ]
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