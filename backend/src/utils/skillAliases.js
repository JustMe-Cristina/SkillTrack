const skillAliases = {
  SQL: ["sql", "structured query language"],

  Excel: ["excel", "microsoft excel"],

  Python: ["python"],

  Statistics: ["statistics", "statistică", "statistica"],

  Tableau: ["tableau"],

  "Power BI": ["power bi", "powerbi"],

  Docker: ["docker"],

  Git: ["git"],

  JavaScript: ["javascript", "js", "java script"],

  React: ["react", "reactjs", "react.js"],

  Node: ["node", "node.js", "nodejs"],

  "Data Analysis": [
    "data analysis",
    "analiza datelor",
    "analiză de date",
    "analiza de date"
  ],

  "Business Analysis": [
    "business analysis",
    "analiză de business",
    "analiza de business"
  ],

  Communication: ["communication", "comunicare"],

  Teamwork: ["teamwork", "lucru în echipă"],

  "Problem Solving": [
    "problem solving",
    "rezolvarea problemelor",
    "solving problems"
  ]
};

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function textContainsAlias(text, alias) {
  const escaped = escapeRegex(alias);
  const regex = new RegExp(`\\b${escaped}\\b`, "i");
  return regex.test(text);
}

function skillMatchesText(skillName, text) {
  const normalizedText = String(text || "").toLowerCase();
  const aliases = skillAliases[skillName] || [skillName];

  return aliases.some((alias) =>
    textContainsAlias(normalizedText, alias.toLowerCase())
  );
}

module.exports = {
  skillAliases,
  skillMatchesText
};