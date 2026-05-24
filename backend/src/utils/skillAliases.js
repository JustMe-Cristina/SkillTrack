const skillAliases = {
  // ── Data / BI ────────────────────────────────────────────────────
  SQL: [
    "sql",
    "structured query language",
    "sql queries",
    "database queries",
    "basic sql",
    "intermediate sql",
    "querying data",
    "interogari sql",
    "interogări sql"
  ],

  MySQL: ["mysql", "my sql"],

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

  Oracle: ["oracle database", "oracle db", "pl/sql", "plsql"],

  PostgreSQL: ["postgresql", "postgres", "psql"],

  Python: [
    "python",
    "python3",
    "python 3",
    "python scripting",
    "python for data analysis",
    "python pentru analiza datelor"
  ],

  Excel: [
    "excel",
    "microsoft excel",
    "ms excel",
    "advanced excel",
    "pivot tables",
    "pivot table",
    "vlookup",
    "xlookup",
    "spreadsheet analysis",
    "spreadsheets"
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

  Reporting: [
    "reporting",
    "business reporting",
    "operational reports",
    "periodic reports",
    "recurring reports",
    "management reports",
    "rapoarte",
    "raportare",
    "rapoarte recurente"
  ],

  "Data Analysis": [
    "data analysis",
    "data analytics",
    "data analyst",
    "analyze data",
    "analysing data",
    "analyzing data",
    "analiza datelor",
    "analiză de date",
    "analiza de date",
    "data insights",
    "data driven insights",
    "data-driven insights",
    "data processing",
    "validating data",
    "data validation",
    "analytical thinking",
    "gandire analitica",
    "gândire analitică"
  ],

  "Data Visualization": [
    "data visualization",
    "data visualisation",
    "data viz",
    "visual analytics",
    "visual reporting",
    "charts",
    "graphs",
    "data storytelling"
  ],

 "Statistical Analysis": [
  "statistical analysis",
  "statistical modeling",
  "statistical methods",
  "statistical tests",
  "hypothesis testing",
  "regression analysis",
  "analiză statistică",
  "analiza statistică"
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
    "data cleansing",
    "data transformation",
    "data quality",
    "data integrity",
    "feature scaling",
    "data normalization"
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

  // ── AI / ML ──────────────────────────────────────────────────────
  "Machine Learning": [
    "machine learning",
    "ml model",
    "model training",
    "predictive modeling",
    "supervised learning",
    "classification model",
    "regression model"
  ],

  "Artificial Intelligence": [
    "artificial intelligence",
    "ai systems",
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

  NumPy: ["numpy", "numpy arrays", "numerical python"],

  Pandas: ["pandas", "dataframes", "pandas dataframe"],

  PySpark: ["pyspark", "apache spark", "spark"],

  Seaborn: ["seaborn"],

  // ── DevOps / Tools ───────────────────────────────────────────────
  Docker: [
    "docker",
    "containerization",
    "containerisation",
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

  Bitbucket: ["bitbucket"],

  "Version Control": [
    "version control",
    "versioning",
    "source control"
  ],

  PowerShell: [
    "powershell",
    "power shell",
    "windows scripting"
  ],

  Bash: [
    "bash",
    "bash scripting",
    "shell scripting",
    "linux scripting",
    "unix scripting"
  ],

  // ── Development ──────────────────────────────────────────────────
  JavaScript: [
    "javascript",
    "java script",
    "ecmascript",
    "vanilla js"
  ],

  React: [
    "react.js",
    "reactjs",
    "react framework",
    "react application",
    "react applications",
    "react frontend",
    "react components"
  ],

  "Node.js": [
    "node.js",
    "nodejs",
    "express.js",
    "express framework",
    "node backend"
  ],

  CSS: ["css", "css3", "stylesheets"],

  HTML: ["html", "html5"],

  "REST APIs": [
    "rest api",
    "rest apis",
    "restful api",
    "restful apis",
    "http api",
    "api endpoints",
    "endpoint development",
    "api development",
    "consume rest api",
    "integrate rest api"
  ],

  MongoDB: [
    "mongodb",
    "mongo db",
    "document database",
    "nosql database"
  ],

  NoSQL: [
    "nosql",
    "no-sql",
    "non-relational database",
    "document store",
    "key-value store"
  ],

  "Object Oriented Programming": [
    "object oriented programming",
    "object-oriented programming",
    "oop",
    "classes and objects",
    "inheritance",
    "encapsulation",
    "polymorphism"
  ],

  "Algorithms and Data Structures": [
    "algorithms",
    "data structures",
    "algorithm design",
    "complexity",
    "sorting algorithms",
    "search algorithms"
  ],

  // ── Business / Product / PM ──────────────────────────────────────
  "Business Analysis": [
    "business analysis",
    "business analyst",
    "analiză de business",
    "analiza de business",
    "requirements gathering",
    "requirements analysis",
    "business requirements",
    "functional requirements",
    "requirement analysis",
    "analiza cerintelor",
    "analiza cerințelor"
  ],

  "Stakeholder Management": [
    "stakeholder management",
    "stakeholders",
    "stakeholder communication",
    "working with stakeholders",
    "colaborarea cu stakeholderi",
    "părți interesate",
    "parti interesate"
  ],

  Documentation: [
    "documentation",
    "documenting requirements",
    "document requirements",
    "functional documentation",
    "technical documentation",
    "business documentation",
    "documentarea cerintelor",
    "documentarea cerințelor",
    "documentare"
  ],

  Communication: [
    "communication skills",
    "strong communication",
    "excellent communication",
    "communicate clearly",
    "presentation skills",
    "abilitati de comunicare",
    "abilități de comunicare",
    "comunicare clară",
    "comunicare"
  ],

  "Problem Solving": [
    "problem solving",
    "problem-solving",
    "analytical problem solving",
    "solving problems",
    "rezolvare de probleme",
    "rezolvarea problemelor"
  ],

  Agile: [
    "agile",
    "agile methodology",
    "agile methodologies",
    "scrum",
    "sprint planning",
    "daily standup",
    "daily stand-up",
    "agile ceremonies",
    "procese agile",
    "metodologii agile"
  ],

  Jira: [
    "jira",
    "atlassian jira",
    "jira tickets",
    "jira tasks",
    "task tracking in jira",
    "urmarirea taskurilor in jira",
    "urmărirea taskurilor în jira"
  ],

  Confluence: [
    "confluence",
    "atlassian confluence"
  ]
};

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function textContainsAlias(text, alias) {
  const cleanAlias = String(alias || "").trim().toLowerCase();

  if (!cleanAlias) return false;

  const escaped = escapeRegex(cleanAlias);

  const regex = new RegExp(
    `(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`,
    "i"
  );

  return regex.test(text);
}

function skillMatchesText(skillName, text) {
  const normalizedText = String(text || "").toLowerCase().trim();

  if (!normalizedText) return false;

  const aliases = skillAliases[skillName] || [String(skillName).toLowerCase()];

  return aliases.some((alias) => textContainsAlias(normalizedText, alias));
}

module.exports = {
  skillAliases,
  skillMatchesText
};