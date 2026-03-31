function detectWorkMode(text) {
  const t = text.toLowerCase();

  if (t.includes("remote")) return "REMOTE";
  if (t.includes("hybrid")) return "HYBRID";

  return "ONSITE";
}

function detectEmploymentType(text) {
  const t = text.toLowerCase();

  if (t.includes("intern")) return "INTERNSHIP";
  if (t.includes("part time")) return "PART_TIME";

  return "FULL_TIME";
}

function detectLocation(text) {
  const cities = [
    "cluj", "bucuresti", "iasi", "timisoara",
    "oradea", "sibiu", "brasov"
  ];

  const t = text.toLowerCase();

  for (const city of cities) {
    if (t.includes(city)) return city;
  }

  return "Necunoscut";
}

module.exports = {
  detectWorkMode,
  detectEmploymentType,
  detectLocation
};