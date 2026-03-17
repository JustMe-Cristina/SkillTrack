const skillAliases = {
  SQL: ["sql", "structured query language", "queries", "database queries"],

  Excel: ["excel", "microsoft excel", "spreadsheets"],

  Python: ["python", "scripting", "automation"],

  Statistics: ["statistics", "statistică", "statistica", "statistical analysis"],

  Tableau: ["tableau"],

  "Power BI": ["power bi", "powerbi", "bi dashboards"],

  Docker: ["docker"],

  Git: ["git", "version control", "source control"],

  JavaScript: ["javascript", "js", "java script", "ecmascript"],

  React: ["react", "reactjs", "react.js"],

  "Node.js": ["node", "node.js", "nodejs", "express", "express.js"],

  "Data Analysis": [
    "data analysis",
    "analiza datelor",
    "analiză de date",
    "analiza de date",
    "data analytics",
    "data cleaning",
    "analyze data"
  ],

  "Business Analysis": [
    "business analysis",
    "analiză de business",
    "analiza de business",
    "business analyst",
    "requirements gathering"
  ],

  CSS: ["css", "styling", "stylesheets"],

  HTML: ["html", "html5", "markup"],

  "REST APIs": ["rest api", "rest apis", "api", "apis", "web services"],

  "Machine Learning": ["machine learning", "ml", "model training"],

  "Responsive Design": [
    "responsive design",
    "responsive interfaces",
    "mobile-friendly",
    "adaptive layout"
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
  const aliases = skillAliases[skillName] || [skillName];

  if (!normalizedText) return false;

  return aliases.some((alias) =>
    textContainsAlias(normalizedText, alias.toLowerCase())
  );
}

module.exports = {
  skillAliases,
  skillMatchesText
};