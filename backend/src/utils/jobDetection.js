function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function detectWorkMode(description) {
  const text = normalizeText(description);

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
  const text = normalizeText(description);

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
  const text = normalizeText(description);

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

function detectExperienceRequirement(description) {
  const text = normalizeText(description);

  const patterns = [
    // 2+ years / 2+ ani
    {
      regex: /(\d+)\s*\+\s*(years?|yrs?|ani|an)\b/i,
      mapper: (match) => ({
        minimum_years: Number(match[1]),
        label: `${match[1]}+ ani`
      })
    },

    // +2 years / +2 ani
    {
      regex: /\+\s*(\d+)\s*(years?|yrs?|ani|an)\b/i,
      mapper: (match) => ({
        minimum_years: Number(match[1]),
        label: `${match[1]}+ ani`
      })
    },

    // 2 plus years
    {
      regex: /(\d+)\s*plus\s*(years?|yrs?|ani|an)\b/i,
      mapper: (match) => ({
        minimum_years: Number(match[1]),
        label: `${match[1]}+ ani`
      })
    },

    // minimum 2 years / minim 2 ani
    {
      regex: /(minimum|minim)\s*(of)?\s*(\d+)\s*(years?|yrs?|ani|an)\b/i,
      mapper: (match) => ({
        minimum_years: Number(match[3]),
        label: `${match[3]}+ ani`
      })
    },

    // at least 2 years
    {
      regex: /at\s+least\s+(\d+)\s*(years?|yrs?|ani|an)\b/i,
      mapper: (match) => ({
        minimum_years: Number(match[1]),
        label: `${match[1]}+ ani`
      })
    },

    // 3-5 years / 3–5 ani
    {
      regex: /(\d+)\s*[-–]\s*(\d+)\s*(years?|yrs?|ani|an)\b/i,
      mapper: (match) => ({
        minimum_years: Number(match[1]),
        label: `${match[1]}-${match[2]} ani`
      })
    },

    // experience of 2 years
    {
      regex: /experience\s*(of)?\s*(\d+)\s*(years?|yrs?)\b/i,
      mapper: (match) => ({
        minimum_years: Number(match[2]),
        label: `${match[2]}+ ani`
      })
    }
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (match) {
      return pattern.mapper(match);
    }
  }

  if (
    text.includes("entry level") ||
    text.includes("graduate") ||
    text.includes("junior") ||
    text.includes("fără experiență") ||
    text.includes("fara experienta") ||
    text.includes("no experience required") ||
    text.includes("no prior experience")
  ) {
    return {
      minimum_years: 0,
      label: "0 ani / entry-level"
    };
  }

  return {
    minimum_years: null,
    label: null
  };
}

function detectEducationRequirement(description) {
  const text = normalizeText(description);

  if (
    text.includes("phd") ||
    text.includes("doctorate") ||
    text.includes("doctoral") ||
    text.includes("doctorat")
  ) {
    return {
      degree_level: "PHD",
      degree_label: "Doctorat"
    };
  }

  if (
    text.includes("master's degree") ||
    text.includes("masters degree") ||
    text.includes("master degree") ||
    text.includes("master") ||
    text.includes("msc") ||
    text.includes("m.sc") ||
    text.includes("studii de master")
  ) {
    return {
      degree_level: "MASTER",
      degree_label: "Master"
    };
  }

  if (
    text.includes("bachelor's degree") ||
    text.includes("bachelors degree") ||
    text.includes("bachelor degree") ||
    text.includes("bachelor") ||
    text.includes("licență") ||
    text.includes("licenta") ||
    text.includes("undergraduate degree") ||
    text.includes("university degree") ||
    text.includes("college degree") ||
    text.includes("higher education")
  ) {
    return {
      degree_level: "BACHELOR",
      degree_label: "Licență"
    };
  }

  if (
    text.includes("high school") ||
    text.includes("liceu") ||
    text.includes("secondary education")
  ) {
    return {
      degree_level: "HIGH_SCHOOL",
      degree_label: "Liceu"
    };
  }

  return {
    degree_level: null,
    degree_label: null
  };
}

module.exports = {
  detectWorkMode,
  detectEmploymentType,
  detectLocation,
  detectExperienceRequirement,
  detectEducationRequirement
};