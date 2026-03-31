function detectWorkMode(description) {
  const text = String(description || "").toLowerCase();

  if (text.includes("hybrid") || text.includes("hibrid")) {
    return "HYBRID";
  }

  if (
    text.includes("remote") ||
    text.includes("work from home") ||
    text.includes("fully remote")
  ) {
    return "REMOTE";
  }

  if (
    text.includes("on-site") ||
    text.includes("onsite") ||
    text.includes("on site") ||
    text.includes("la fața locului") ||
    text.includes("la fata locului")
  ) {
    return "ONSITE";
  }

  return null;
}

function detectEmploymentType(description) {
  const text = String(description || "").toLowerCase();

  if (text.includes("internship")) {
    return "INTERNSHIP";
  }

  if (
    text.includes("part-time") ||
    text.includes("part time") ||
    text.includes("parttime")
  ) {
    return "PART_TIME";
  }

  if (
    text.includes("full-time") ||
    text.includes("full time") ||
    text.includes("fulltime")
  ) {
    return "FULL_TIME";
  }

  return null;
}

function detectLocation(description) {
  const text = String(description || "").toLowerCase();

  const cityMap = [
    { keywords: ["cluj-napoca", "cluj napoca", "cluj"], value: "Cluj-Napoca" },
    { keywords: ["bucurești", "bucuresti"], value: "București" },
    { keywords: ["timișoara", "timisoara"], value: "Timișoara" },
    { keywords: ["iași", "iasi"], value: "Iași" },
    { keywords: ["sibiu"], value: "Sibiu" },
    { keywords: ["brașov", "brasov"], value: "Brașov" },
    { keywords: ["oradea"], value: "Oradea" },
    { keywords: ["berlin"], value: "Berlin" },
    { keywords: ["amsterdam"], value: "Amsterdam" },
    { keywords: ["london"], value: "Londra" },
    { keywords: ["munich", "münchen"], value: "Munchen" },
    { keywords: ["dublin"], value: "Dublin" }
  ];

  for (const city of cityMap) {
    for (const keyword of city.keywords) {
      if (text.includes(keyword)) {
        return city.value;
      }
    }
  }

  if (text.includes("remote romania") || text.includes("remote românia")) {
    return "Remote (România)";
  }

  if (text.includes("romania") || text.includes("românia")) {
    return "România";
  }

  return null;
}

module.exports = {
  detectWorkMode,
  detectEmploymentType,
  detectLocation
};