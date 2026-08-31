/**
 * Everglades Lesson Finder — the entire app (Cloudflare Worker).
 *
 * Sheet fetch, structured search, widget JS, demo/Wix pages, and JSON APIs
 * all live here. Named exports exist so `node:test` can import the helpers.
 * Export functions only — Cloudflare treats other named exports as handlers.
 */

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_RESULTS = 4;
const STRONG_WORD_LENGTH = 7;
const MIN_KEYWORD_MATCHES = 2;

const FUNDAMENTAL_CONCEPTS = {
  1: "The Everglades is unique and valuable.",
  2: "The Everglades is defined and connected by water.",
  3: "The Everglades is shaped by southern Florida's geology and geography.",
  4: "The Everglades influences and is influenced by weather and climate.",
  5: "The Everglades supports and is connected by a great diversity of life and ecosystems.",
  6: "The Everglades has experienced many changes over time and is endangered.",
  7: "The Everglades and people are inextricably interconnected.",
};

const GRADE_WORDS = {
  prek: -1,
  "pre-k": -1,
  preschool: -1,
  kindergarten: 0,
  k: 0,
};

// NGSSS / VPK codes mix letters and digits: SC.5.L.17.1, SC.K.L.14.3, SS.912.A.6.10, VPK-SC.1
const STANDARD_PATTERN = /\b((?:[A-Z]{2,3}|VPK-SC)(?:\.[A-Z0-9]+)+)\b/i;

const STOPWORDS = new Set([
  "the", "and", "about", "find", "a", "an", "lesson", "lessons", "show", "me",
  "what", "which", "does", "align", "with", "cover", "covers", "for", "who",
  "how", "that", "this", "from", "into", "near", "is", "are", "to", "of", "on",
  "in", "grade", "graders",
]);

/** Bundled catalog used when SHEET_CSV_URL is empty or the Sheet is unreachable. */
const FALLBACK_LESSONS = [
  {
    id: "invasive-pythons-melaleuca",
    title: "Pythons & Melaleuca: Uninvited Guests",
    gradeRange: "Grade 5",
    gradeMin: 5,
    gradeMax: 5,
    topics: ["invasive species", "food webs", "wildlife management"],
    ngsssStandards: ["SC.5.L.17.1"],
    fundamentalConcept: FUNDAMENTAL_CONCEPTS[7],
    summary:
      "Students investigate how non-native pythons and melaleuca disrupt Everglades food webs, then propose management strategies to protect native species.",
    lessonUrl: "https://www.evergladesliteracy.org/lessons/pythons-melaleuca",
    pdfUrl: "https://www.evergladesliteracy.org/lessons/pythons-melaleuca.pdf",
  },
  {
    id: "dont-feed-the-gators",
    title: "Don't Feed the Gators!",
    gradeRange: "Grades 2-3",
    gradeMin: 2,
    gradeMax: 3,
    topics: ["invasive species", "wildlife safety", "human impact"],
    ngsssStandards: ["SC.3.L.17.2"],
    fundamentalConcept: FUNDAMENTAL_CONCEPTS[7],
    summary:
      "A read-aloud and discussion lesson on why feeding alligators endangers people and wildlife, and what safe coexistence looks like near wetlands.",
    lessonUrl: "https://www.evergladesliteracy.org/lessons/dont-feed-the-gators",
    pdfUrl: "https://www.evergladesliteracy.org/lessons/dont-feed-the-gators.pdf",
  },
  {
    id: "water-cycle-river-of-grass",
    title: "The River of Grass: Tracing the Water Cycle",
    gradeRange: "Grade 4",
    gradeMin: 4,
    gradeMax: 4,
    topics: ["water cycle", "hydrology", "watersheds"],
    ngsssStandards: ["SC.4.E.6.6"],
    fundamentalConcept: FUNDAMENTAL_CONCEPTS[2],
    summary:
      "Students model evaporation, condensation, and sheet flow to understand why the Everglades is called a 'river of grass' rather than a swamp.",
    lessonUrl: "https://www.evergladesliteracy.org/lessons/river-of-grass-water-cycle",
    pdfUrl: "https://www.evergladesliteracy.org/lessons/river-of-grass-water-cycle.pdf",
  },
  {
    id: "kindergarten-wetland-senses",
    title: "A Wetland Walk: Sights and Sounds",
    gradeRange: "Kindergarten",
    gradeMin: 0,
    gradeMax: 0,
    topics: ["habitats", "observation", "wetlands"],
    ngsssStandards: ["SC.K.L.14.3"],
    fundamentalConcept: FUNDAMENTAL_CONCEPTS[5],
    summary:
      "An introductory sensory lesson where young learners sort pictures of Everglades plants and animals by the habitat they live in.",
    lessonUrl: "https://www.evergladesliteracy.org/lessons/wetland-walk-senses",
    pdfUrl: "https://www.evergladesliteracy.org/lessons/wetland-walk-senses.pdf",
  },
  {
    id: "prek-gator-turtle-sort",
    title: "Gator or Turtle? A Sorting Story",
    gradeRange: "Pre-K",
    gradeMin: -1,
    gradeMax: -1,
    topics: ["wildlife", "habitats", "sorting"],
    ngsssStandards: ["VPK-SC.1"],
    fundamentalConcept: FUNDAMENTAL_CONCEPTS[5],
    summary:
      "A picture-sorting circle-time activity introducing PreK students to two iconic Everglades animals and where they live.",
    lessonUrl: "https://www.evergladesliteracy.org/lessons/gator-turtle-sort",
    pdfUrl: "https://www.evergladesliteracy.org/lessons/gator-turtle-sort.pdf",
  },
  {
    id: "wading-birds-rookery",
    title: "Rookery Watch: Wading Birds of the Glades",
    gradeRange: "Grade 3",
    gradeMin: 3,
    gradeMax: 3,
    topics: ["wading birds", "biodiversity", "adaptation"],
    ngsssStandards: ["SC.3.L.15.1"],
    fundamentalConcept: FUNDAMENTAL_CONCEPTS[5],
    summary:
      "Students compare beak and leg shapes across egrets, herons, and storks to see how each species is adapted to feeding in shallow water.",
    lessonUrl: "https://www.evergladesliteracy.org/lessons/rookery-watch-wading-birds",
    pdfUrl: "https://www.evergladesliteracy.org/lessons/rookery-watch-wading-birds.pdf",
  },
  {
    id: "sawgrass-marsh-ecosystem",
    title: "Life in the Sawgrass Marsh",
    gradeRange: "Grade 6",
    gradeMin: 6,
    gradeMax: 6,
    topics: ["sawgrass", "ecosystems", "biodiversity"],
    ngsssStandards: ["SC.6.L.15.1"],
    fundamentalConcept: FUNDAMENTAL_CONCEPTS[5],
    summary:
      "A field-journal style lesson mapping the producers, consumers, and decomposers that make up a sawgrass marsh food web.",
    lessonUrl: "https://www.evergladesliteracy.org/lessons/sawgrass-marsh-ecosystem",
    pdfUrl: "https://www.evergladesliteracy.org/lessons/sawgrass-marsh-ecosystem.pdf",
  },
  {
    id: "mangrove-coastline-defenders",
    title: "Mangroves: The Coastline's Defenders",
    gradeRange: "Grade 7",
    gradeMin: 7,
    gradeMax: 7,
    topics: ["mangroves", "coastal ecosystems", "storm protection"],
    ngsssStandards: ["SC.7.E.6.6"],
    fundamentalConcept: FUNDAMENTAL_CONCEPTS[5],
    summary:
      "Students examine how mangrove root systems buffer storm surge and stabilize sediment, using satellite imagery of Florida's coastline.",
    lessonUrl: "https://www.evergladesliteracy.org/lessons/mangroves-coastline-defenders",
    pdfUrl: "https://www.evergladesliteracy.org/lessons/mangroves-coastline-defenders.pdf",
  },
  {
    id: "florida-panther-corridor",
    title: "Panther Crossing: Wildlife Corridors",
    gradeRange: "Grade 8",
    gradeMin: 8,
    gradeMax: 8,
    topics: ["florida panther", "wildlife corridors", "human impact"],
    ngsssStandards: ["SC.8.L.18.4"],
    fundamentalConcept: FUNDAMENTAL_CONCEPTS[7],
    summary:
      "Students analyze habitat fragmentation data to design a wildlife corridor proposal that protects the endangered Florida panther.",
    lessonUrl: "https://www.evergladesliteracy.org/lessons/panther-crossing-corridors",
    pdfUrl: "https://www.evergladesliteracy.org/lessons/panther-crossing-corridors.pdf",
  },
  {
    id: "everglades-restoration-history",
    title: "Draining and Restoring: An Everglades History",
    gradeRange: "Grade 9",
    gradeMin: 9,
    gradeMax: 9,
    topics: ["everglades restoration", "history", "water management"],
    ngsssStandards: ["SS.912.A.6.10"],
    fundamentalConcept: FUNDAMENTAL_CONCEPTS[6],
    summary:
      "A primary-source lesson tracing 20th-century canal drainage projects through to the modern Comprehensive Everglades Restoration Plan (CERP).",
    lessonUrl: "https://www.evergladesliteracy.org/lessons/draining-and-restoring-history",
    pdfUrl: "https://www.evergladesliteracy.org/lessons/draining-and-restoring-history.pdf",
  },
  {
    id: "sea-level-rise-modeling",
    title: "Rising Water: Modeling Sea Level Change",
    gradeRange: "Grade 10",
    gradeMin: 10,
    gradeMax: 10,
    topics: ["climate change", "sea level rise", "data modeling"],
    ngsssStandards: ["SC.912.E.7.8"],
    fundamentalConcept: FUNDAMENTAL_CONCEPTS[4],
    summary:
      "Students graph historical tide-gauge data and project future sea level rise scenarios for South Florida's coastline.",
    lessonUrl: "https://www.evergladesliteracy.org/lessons/rising-water-sea-level-modeling",
    pdfUrl: "https://www.evergladesliteracy.org/lessons/rising-water-sea-level-modeling.pdf",
  },
  {
    id: "citizen-science-water-quality",
    title: "Citizen Scientists: Testing Water Quality",
    gradeRange: "Grade 11",
    gradeMin: 11,
    gradeMax: 11,
    topics: ["water quality", "citizen science", "hydrology"],
    ngsssStandards: ["SC.912.L.17.20"],
    fundamentalConcept: FUNDAMENTAL_CONCEPTS[2],
    summary:
      "A hands-on protocol for testing phosphorus levels and turbidity in local waterways, framed around real Everglades monitoring programs.",
    lessonUrl: "https://www.evergladesliteracy.org/lessons/citizen-scientists-water-quality",
    pdfUrl: "https://www.evergladesliteracy.org/lessons/citizen-scientists-water-quality.pdf",
  },
  {
    id: "everglades-economy-tourism",
    title: "The Everglades Economy: Tourism and Trade-offs",
    gradeRange: "Grade 12",
    gradeMin: 12,
    gradeMax: 12,
    topics: ["economics", "tourism", "human impact"],
    ngsssStandards: ["SS.912.E.1.5"],
    fundamentalConcept: FUNDAMENTAL_CONCEPTS[7],
    summary:
      "Students weigh the economic benefits of eco-tourism against the environmental costs of development along the Everglades' edge.",
    lessonUrl: "https://www.evergladesliteracy.org/lessons/everglades-economy-tourism",
    pdfUrl: "https://www.evergladesliteracy.org/lessons/everglades-economy-tourism.pdf",
  },
  {
    id: "middle-school-invasive-lionfish",
    title: "Lionfish on the Loose",
    gradeRange: "Grades 6-8",
    gradeMin: 6,
    gradeMax: 8,
    topics: ["invasive species", "marine biology", "food webs"],
    ngsssStandards: ["SC.7.L.17.2"],
    fundamentalConcept: FUNDAMENTAL_CONCEPTS[7],
    summary:
      "Students trace how invasive lionfish spread through Florida's coastal waters and evaluate proposed control methods.",
    lessonUrl: "https://www.evergladesliteracy.org/lessons/lionfish-on-the-loose",
    pdfUrl: "https://www.evergladesliteracy.org/lessons/lionfish-on-the-loose.pdf",
  },
];

export function getFallbackLessons() {
  return FALLBACK_LESSONS;
}

export function getFundamentalConcepts() {
  return FUNDAMENTAL_CONCEPTS;
}

let catalogCache = { lessons: null, source: "fallback", fetchedAt: 0 };

export function bustCatalogCache() {
  catalogCache = { lessons: null, source: "fallback", fetchedAt: 0 };
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const input = String(text ?? "").replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function getField(rec, ...names) {
  const keys = Object.keys(rec);
  for (const name of names) {
    const want = String(name).trim().toLowerCase();
    const key = keys.find((k) => String(k).trim().toLowerCase() === want);
    if (key != null && rec[key] != null && String(rec[key]).trim() !== "") {
      return String(rec[key]).trim();
    }
  }
  return "";
}

export function splitList(raw) {
  if (!raw) return [];
  const parts = [];
  for (const piece of String(raw).split(/[,;]+/)) {
    const item = piece.replace(/\s+/g, " ").trim();
    if (item) parts.push(item);
  }
  return parts;
}

export function uniqueStrings(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

export function conceptLabel(raw) {
  if (!raw) return "";
  const names = [];
  for (const piece of String(raw).split(/[,;]+/)) {
    const trimmed = piece.trim();
    if (!trimmed) continue;
    const num = Number(trimmed);
    if (Number.isInteger(num) && FUNDAMENTAL_CONCEPTS[num]) {
      names.push(FUNDAMENTAL_CONCEPTS[num]);
    } else {
      names.push(trimmed);
    }
  }
  return names.join(" ");
}

export function gradeBand(gradeCol, gradeSort) {
  const text = String(gradeCol || "");
  const lower = text.toLowerCase();
  const rawSort = gradeSort == null ? "" : String(gradeSort).trim();
  const sort = rawSort === "" ? null : Number(rawSort);
  const hasSort = sort != null && Number.isFinite(sort);

  if ((hasSort && sort === -1) || /\bpre[\s-]?k\b/.test(lower) || lower.includes("preschool")) {
    if (!hasSort || sort === -1) {
      return { gradeRange: "Pre-K", gradeMin: -1, gradeMax: -1 };
    }
  }
  if ((hasSort && sort === 0) || lower.includes("kindergarten")) {
    if (!hasSort || sort === 0) {
      return { gradeRange: "Kindergarten", gradeMin: 0, gradeMax: 0 };
    }
  }

  const range = text.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})/);
  if (range) {
    const a = parseInt(range[1], 10);
    const b = parseInt(range[2], 10);
    if (a === 9 && b === 12) {
      return { gradeRange: "Grades 9-12", gradeMin: 9, gradeMax: 12 };
    }
    return { gradeRange: `Grades ${a}-${b}`, gradeMin: Math.min(a, b), gradeMax: Math.max(a, b) };
  }

  if (lower.includes("high school")) {
    return { gradeRange: "Grades 9-12", gradeMin: 9, gradeMax: 12 };
  }

  if (hasSort) {
    if (sort === -1) return { gradeRange: "Pre-K", gradeMin: -1, gradeMax: -1 };
    if (sort === 0) return { gradeRange: "Kindergarten", gradeMin: 0, gradeMax: 0 };
    return { gradeRange: `Grade ${sort}`, gradeMin: sort, gradeMax: sort };
  }

  return { gradeRange: text || "Grade", gradeMin: 0, gradeMax: 12 };
}

export function isActiveStatus(status) {
  return String(status || "").trim().toLowerCase() === "active";
}

export function mapSheetRow(rec) {
  const status = getField(rec, "Status");
  if (!isActiveStatus(status)) return null;

  const id = getField(rec, "Lesson ID", "id", "LessonID");
  const title = getField(rec, "Title of Lesson", "Title");
  if (!id && !title) return null;
  if (!title) return null;

  const gradeCol = getField(rec, "Grade");
  const gradeSortRaw = getField(rec, "Grade Sort", "GradeSort");
  const { gradeRange, gradeMin, gradeMax } = gradeBand(gradeCol, gradeSortRaw);

  const theme = getField(rec, "Theme / Topic", "Theme", "Topic");
  const topics = uniqueStrings([...splitList(getField(rec, "Topic Tags", "Topics")), ...splitList(theme)]);
  const standards = splitList(getField(rec, "Standards (as published)", "Standards", "ngsssStandards"));
  const concept = conceptLabel(getField(rec, "Fundamental Concepts", "Fundamental Concept"));
  const summary = getField(rec, "Summary of Lesson", "Summary") ||
    `${title} — a ${gradeRange} lesson in the Everglades Literacy Teacher Toolkit.`;

  return {
    id: id || slugify(title),
    title,
    gradeRange,
    gradeMin,
    gradeMax,
    topics,
    ngsssStandards: standards,
    fundamentalConcept: concept,
    summary,
    lessonUrl: getField(rec, "lessonUrl", "Lesson URL", "LessonUrl"),
    pdfUrl: getField(rec, "pdfUrl", "PDF URL", "PdfUrl"),
  };
}

function slugify(title) {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function lessonsFromCsv(csv) {
  return parseSheetCsv(csv);
}

export function parseSheetCsv(csv) {
  const rows = parseCsv(csv);
  if (!rows.length) return [];

  let headerIdx = 0;
  for (let i = 0; i < Math.min(rows.length, 12); i++) {
    const hit = rows[i].some((c) => /^lesson id$/i.test(String(c).trim()));
    if (hit) {
      headerIdx = i;
      break;
    }
  }

  const headers = rows[headerIdx].map((h) => String(h).trim());
  const lessons = [];
  for (const raw of rows.slice(headerIdx + 1)) {
    if (!raw.some((c) => String(c || "").trim())) continue;
    const rec = {};
    headers.forEach((h, i) => {
      rec[h] = raw[i] ?? "";
    });
    const lesson = mapSheetRow(rec);
    if (lesson) lessons.push(lesson);
  }
  return lessons;
}

export function extractGrade(query) {
  const lower = query.toLowerCase();
  for (const [word, grade] of Object.entries(GRADE_WORDS)) {
    if (lower.includes(word)) return grade;
  }
  const ordinal = lower.match(/(\d{1,2})(st|nd|rd|th)?[\s-]*grade/);
  if (ordinal) return parseInt(ordinal[1], 10);
  const shortForm = lower.match(/\bgrade[\s-]*(\d{1,2})\b/);
  if (shortForm) return parseInt(shortForm[1], 10);
  return null;
}

export function extractStandard(query) {
  const match = query.match(STANDARD_PATTERN);
  return match ? match[1].toUpperCase() : null;
}

export function searchLessons(query, lessons = FALLBACK_LESSONS) {
  const trimmed = String(query ?? "").trim();
  if (!trimmed) {
    return {
      text: "What would you like to find — a topic, grade level, or standard?",
      lessons: [],
    };
  }

  const grade = extractGrade(trimmed);
  const standard = extractStandard(trimmed);
  const words = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9\s.-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

  const scored = lessons.map((lesson) => {
    let score = 0;
    if (standard && (lesson.ngsssStandards || []).some((s) => String(s).toUpperCase() === standard)) {
      score += 10;
    }
    if (grade !== null && grade >= lesson.gradeMin && grade <= lesson.gradeMax) {
      score += 3;
    }
    const haystack = [
      lesson.title,
      lesson.summary,
      lesson.fundamentalConcept,
      ...(lesson.topics || []),
    ]
      .join(" ")
      .toLowerCase();
    const matchedWords = words.filter((w) => haystack.includes(w));
    const hasStrongWord = matchedWords.some((w) => w.length >= STRONG_WORD_LENGTH);
    if (matchedWords.length >= MIN_KEYWORD_MATCHES || hasStrongWord) {
      score += matchedWords.length;
    }
    return { lesson, score };
  });

  const matches = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map((s) => s.lesson);

  if (matches.length === 0) {
    return {
      text: "I couldn't find a lesson matching that in the Teacher Toolkit. Try naming a topic, grade level, or NGSSS standard.",
      lessons: [],
    };
  }

  return {
    text: describeMatches(matches, { grade, standard }),
    lessons: matches,
  };
}

function describeMatches(matches, filters) {
  const lead = matches.length === 1 ? "Here's a lesson" : `Here are ${matches.length} lessons`;
  if (filters.standard) return `${lead} aligned with ${filters.standard}:`;
  if (filters.grade !== null) {
    const gradeLabel =
      filters.grade === -1 ? "PreK" : filters.grade === 0 ? "Kindergarten" : `grade ${filters.grade}`;
    return `${lead} for ${gradeLabel}:`;
  }
  return `${lead} from the Teacher Toolkit:`;
}

export function corsAllowOrigin(origin, allowedOriginsCsv) {
  if (!origin) return null;
  const allowed = parseAllowedOrigins(allowedOriginsCsv);
  return allowOrigin(origin, allowed) || null;
}

export function parseAllowedOrigins(csv) {
  return String(csv || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function allowOrigin(origin, allowed) {
  if (!origin) return "";
  const list = Array.isArray(allowed) ? allowed : parseAllowedOrigins(allowed);
  if (list.includes("*") || list.includes(origin)) return origin;
  try {
    const host = new URL(origin).hostname;
    if (host === "localhost" || host === "127.0.0.1") return origin;
  } catch {
    /* ignore */
  }
  return "";
}

export async function getCatalog(env, now = Date.now()) {
  if (catalogCache.lessons && now - catalogCache.fetchedAt < CACHE_TTL_MS) {
    return catalogCache;
  }
  const url = String(env?.SHEET_CSV_URL || "").trim();
  if (!url) {
    catalogCache = { lessons: FALLBACK_LESSONS, source: "fallback", fetchedAt: now };
    return catalogCache;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`sheet ${res.status}`);
    const csv = await res.text();
    const lessons = parseSheetCsv(csv);
    if (!lessons.length) throw new Error("empty catalog");
    catalogCache = { lessons, source: "sheet", fetchedAt: now };
    return catalogCache;
  } catch {
    catalogCache = { lessons: FALLBACK_LESSONS, source: "fallback", fetchedAt: now };
    return catalogCache;
  }
}

function authorized(request, env) {
  const key = env?.API_KEY;
  if (!key) return true;
  if (request.headers.get("X-API-Key") === key) return true;
  const auth = request.headers.get("Authorization") || "";
  return auth === `Bearer ${key}`;
}

function headerMap(request, env, extra = {}) {
  const origin = corsAllowOrigin(request.headers.get("Origin") || "", env?.ALLOWED_ORIGINS);
  const headers = {
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization",
    "Access-Control-Max-Age": "86400",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Content-Security-Policy": "frame-ancestors *",
    "X-Content-Type-Options": "nosniff",
    ...extra,
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return headers;
}

function withHeaders(body, status, request, env, extra) {
  const headers = new Headers(headerMap(request, env, extra));
  headers.delete("X-Frame-Options");
  return new Response(body, { status, headers });
}

function jsonResponse(data, request, env, status = 200) {
  return withHeaders(JSON.stringify(data), status, request, env, {
    "Content-Type": "application/json; charset=utf-8",
  });
}

function htmlResponse(html, request, env, status = 200) {
  return withHeaders(html, status, request, env, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-cache",
  });
}

function jsResponse(js, request, env) {
  return withHeaders(js, 200, request, env, {
    "Content-Type": "text/javascript; charset=utf-8",
    "Cache-Control": "public, max-age=60",
  });
}

async function handleSearch(request, env) {
  let query = "";
  try {
    const body = await request.json();
    query = body?.query ?? body?.q ?? "";
  } catch {
    query = "";
  }
  const catalog = await getCatalog(env);
  const reply = searchLessons(query, catalog.lessons);
  return jsonResponse({ ...reply, catalogSource: catalog.source }, request, env);
}

async function handleLessons(request, env) {
  const catalog = await getCatalog(env);
  return jsonResponse(
    { lessons: catalog.lessons, catalogSource: catalog.source, count: catalog.lessons.length },
    request,
    env,
  );
}

async function handleRefresh(request, env) {
  if (!authorized(request, env)) {
    return jsonResponse({ error: "unauthorized" }, request, env, 401);
  }
  bustCatalogCache();
  const catalog = await getCatalog(env);
  return jsonResponse(
    { ok: true, catalogSource: catalog.source, count: catalog.lessons.length },
    request,
    env,
  );
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return withHeaders(null, 204, request, env);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/health" && (request.method === "GET" || request.method === "HEAD")) {
      const catalog = await getCatalog(env);
      return jsonResponse(
        {
          ok: true,
          worker: "lessonfinder",
          catalog: catalog.source,
          lessons: catalog.lessons.length,
        },
        request,
        env,
      );
    }
    if (path === "/api/lessons" && request.method === "GET") {
      return handleLessons(request, env);
    }
    if (path === "/api/search" && request.method === "POST") {
      return handleSearch(request, env);
    }
    if (path === "/api/refresh" && request.method === "POST") {
      return handleRefresh(request, env);
    }
    if (path === "/widget.js" && (request.method === "GET" || request.method === "HEAD")) {
      return jsResponse(widgetJs(), request, env);
    }
    if ((path === "/" || path === "/index.html") && (request.method === "GET" || request.method === "HEAD")) {
      return htmlResponse(demoHtml(), request, env);
    }
    if (path === "/wix.html" && (request.method === "GET" || request.method === "HEAD")) {
      return htmlResponse(wixHtml(url.origin), request, env);
    }
    if (path === "/wix-embed.html" && (request.method === "GET" || request.method === "HEAD")) {
      return htmlResponse(wixEmbedHtml(), request, env);
    }
    if (path === "/wix-custom-element.html" && (request.method === "GET" || request.method === "HEAD")) {
      return htmlResponse(wixCustomElementHtml(), request, env);
    }
    if (path === "/lesson-plan-demo.html" && (request.method === "GET" || request.method === "HEAD")) {
      return htmlResponse(lessonDemoHtml(), request, env);
    }

    return jsonResponse({ error: "not found" }, request, env, 404);
  },
};

/* -------------------------------------------------------------------------- */
/*  Pages + widget (served as strings)                                        */
/* -------------------------------------------------------------------------- */

function widgetCss() {
  return `@import url("https://fonts.googleapis.com/css2?family=Bitter:wght@600;700&family=Public+Sans:wght@400;500;600&display=swap");

:host,
.elf-root {
  --cypress: #16352a;
  --sawgrass: #7c9a4c;
  --teal: #2e7d74;
  --egret: #faf9f2;
  --text-muted: #5c6f5e;
  --chip-bg: #eee7d6;
  --shadow: 0 12px 32px rgba(22, 53, 42, 0.24);
  all: initial;
  font-family: "Public Sans", -apple-system, sans-serif;
}

.elf-root * {
  box-sizing: border-box;
  font-family: inherit;
}

.elf-launcher {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--cypress);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow);
  z-index: 2147483000;
  transition: transform 0.15s ease;
}

.elf-launcher:hover { transform: scale(1.06); }
.elf-launcher svg { width: 28px; height: 28px; }

.elf-panel {
  position: fixed;
  right: 24px;
  bottom: 96px;
  width: 380px;
  max-width: calc(100vw - 32px);
  height: 560px;
  max-height: calc(100vh - 140px);
  background: var(--egret);
  border-radius: 16px;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 2147483000;
  opacity: 0;
  transform: translateY(12px) scale(0.98);
  pointer-events: none;
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.elf-panel.elf-open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.elf-header {
  background: var(--cypress);
  color: var(--egret);
  padding: 20px 20px 0 20px;
  position: relative;
  flex-shrink: 0;
}

.elf-header h1 {
  font-family: "Bitter", serif;
  font-weight: 700;
  font-size: 20px;
  margin: 0 0 6px 0;
}

.elf-header p {
  font-size: 13px;
  line-height: 1.4;
  color: rgba(250, 249, 242, 0.78);
  margin: 0 0 16px 0;
  padding-right: 28px;
}

.elf-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  color: var(--egret);
  opacity: 0.75;
  cursor: pointer;
  padding: 4px;
  line-height: 0;
}
.elf-close:hover { opacity: 1; }

.elf-grass {
  height: 12px;
  width: 100%;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='12' viewBox='0 0 20 12'%3E%3Cpath d='M0,0 L10,12 L20,0 Z' fill='%237C9A4C'/%3E%3C/svg%3E");
  background-repeat: repeat-x;
  background-size: 20px 12px;
  flex-shrink: 0;
}

.elf-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.elf-bubble {
  max-width: 88%;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.45;
}
.elf-bubble.elf-assistant {
  align-self: flex-start;
  background: #ffffff;
  color: var(--cypress);
  border: 1px solid rgba(22, 53, 42, 0.08);
  border-bottom-left-radius: 4px;
}
.elf-bubble.elf-user {
  align-self: flex-end;
  background: var(--cypress);
  color: var(--egret);
  border-bottom-right-radius: 4px;
}

.elf-chip {
  display: block;
  width: 100%;
  text-align: left;
  background: #ffffff;
  color: var(--cypress);
  border: 1px solid rgba(22, 53, 42, 0.12);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease;
}
.elf-chip:hover {
  background: var(--chip-bg);
  border-color: var(--sawgrass);
}
.elf-chips {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-self: stretch;
}

.elf-card {
  align-self: stretch;
  background: #ffffff;
  border: 1px solid rgba(22, 53, 42, 0.08);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.elf-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.elf-card-title {
  font-family: "Bitter", serif;
  font-weight: 700;
  font-size: 15px;
  color: var(--cypress);
  margin: 0;
}
.elf-badge {
  flex-shrink: 0;
  background: var(--chip-bg);
  color: var(--cypress);
  font-size: 11px;
  font-weight: 600;
  padding: 4px 9px;
  border-radius: 999px;
  white-space: nowrap;
}
.elf-card-summary {
  font-size: 13px;
  line-height: 1.45;
  color: var(--cypress);
  margin: 0;
}
.elf-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(22, 53, 42, 0.08);
}
.elf-standard {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
}
.elf-card-link {
  font-size: 13px;
  font-weight: 600;
  color: var(--teal);
  text-decoration: none;
  white-space: nowrap;
}
.elf-card-link:hover { text-decoration: underline; }

.elf-inputrow {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid rgba(22, 53, 42, 0.1);
  background: #ffffff;
}
.elf-input {
  flex: 1;
  border: 1px solid rgba(22, 53, 42, 0.18);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  color: var(--cypress);
  background: var(--egret);
}
.elf-input:focus {
  outline: 2px solid var(--sawgrass);
  outline-offset: 1px;
}
.elf-send {
  background: var(--teal);
  color: var(--egret);
  border: none;
  border-radius: 10px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.elf-send:hover { background: #26645d; }
.elf-send:disabled { opacity: 0.5; cursor: not-allowed; }

.elf-root.elf-inline {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  min-height: 420px;
}
.elf-inline .elf-launcher,
.elf-inline .elf-close { display: none; }
.elf-inline .elf-panel {
  position: absolute;
  inset: 0;
  width: auto;
  height: auto;
  max-width: none;
  max-height: none;
  opacity: 1;
  transform: none;
  pointer-events: auto;
  border-radius: 12px;
}
.elf-launcher,
.elf-panel { pointer-events: auto; }

@media (max-width: 480px) {
  .elf-panel {
    right: 12px;
    left: 12px;
    bottom: 88px;
    width: auto;
    max-width: none;
    height: auto;
    max-height: calc(100vh - 116px);
  }
  .elf-launcher { right: 16px; bottom: 16px; }
}
`;
}

function widgetJs() {
  const css = JSON.stringify(widgetCss());
  return `(function () {
  if (window.__elfWidgetBooted) return;
  window.__elfWidgetBooted = true;

  var HOST_ID = "everglades-lesson-finder-host";
  var TAG_NAME = "everglades-lesson-finder";
  var SCRIPT_SELECTOR = "script[data-elf-widget], script[src*='widget.js']";
  var CSS = ${css};

  var QUICK_PROMPTS = [
    "Find a 5th-grade lesson on invasive species",
    "Which lessons cover the water cycle?",
    "What standards does \\"Don't Feed the Gators!\\" align with?",
    "Show me a lesson about wading birds"
  ];
  var GREETING = "Hi! I can help you find Everglades Literacy lessons by topic, grade level, NGSSS standard, or Fundamental Concept. What are you looking for?";

  function resolveAssetBase() {
    var current = document.currentScript;
    if (current && current.src) return new URL(".", current.src);
    var marked = document.querySelector(SCRIPT_SELECTOR);
    if (marked && marked.src) return new URL(".", marked.src);
    return new URL("./", location.href);
  }
  var ASSET_BASE = resolveAssetBase();
  var API_ORIGIN = ASSET_BASE.origin;

  function isEmbeddedFrame() {
    try { return window.self !== window.top; } catch (e) { return true; }
  }
  function requestedMode() {
    var script = document.currentScript || document.querySelector(SCRIPT_SELECTOR);
    var value = script && script.getAttribute("data-elf-mode");
    value = value ? value.toLowerCase() : "";
    if (value === "inline" || value === "float") return value;
    return null;
  }
  function detectMode() {
    return requestedMode() || (isEmbeddedFrame() ? "inline" : "float");
  }
  function shouldAutoMountFloat() {
    if (detectMode() === "inline") return false;
    if (document.querySelector(TAG_NAME)) return false;
    return true;
  }
  function demoLessonUrl(title) {
    var url = new URL("lesson-plan-demo.html", ASSET_BASE);
    url.searchParams.set("title", title);
    return url.toString();
  }
  function lessonHref(lesson) {
    if (lesson && lesson.lessonUrl) return lesson.lessonUrl;
    return demoLessonUrl(lesson && lesson.title ? lesson.title : "Lesson");
  }

  function svgIcon(path, size) {
    size = size || 24;
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("fill", "none");
    var p = document.createElementNS(ns, "path");
    p.setAttribute("d", path);
    p.setAttribute("stroke", "currentColor");
    p.setAttribute("stroke-width", "2");
    p.setAttribute("stroke-linecap", "round");
    p.setAttribute("stroke-linejoin", "round");
    svg.appendChild(p);
    return svg;
  }

  function LessonFinderWidget(host, mode) {
    this.mode = mode || "float";
    this.shadow = host.shadowRoot || host.attachShadow({ mode: "open" });
    this.chipsEl = null;
    this.isOpen = false;
    this.hasGreeted = false;
    if (this.shadow.childNodes.length === 0) this.render();
    if (this.mode === "inline") this.toggle(true);
  }

  LessonFinderWidget.prototype.render = function () {
    var style = document.createElement("style");
    style.textContent = CSS;
    this.shadow.appendChild(style);

    var container = document.createElement("div");
    container.className = this.mode === "inline" ? "elf-root elf-inline" : "elf-root";

    var launcher = document.createElement("button");
    launcher.className = "elf-launcher";
    launcher.setAttribute("aria-label", "Open Everglades Lesson Finder");
    launcher.setAttribute("aria-expanded", "false");
    launcher.style.color = "#faf9f2";
    launcher.appendChild(svgIcon("M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"));
    var self = this;
    launcher.addEventListener("click", function () { self.toggle(); });
    this.launcher = launcher;

    var panel = document.createElement("div");
    panel.className = "elf-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Everglades Lesson Finder");
    this.panel = panel;

    var header = document.createElement("div");
    header.className = "elf-header";
    var closeBtn = document.createElement("button");
    closeBtn.className = "elf-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.appendChild(svgIcon("M18 6 6 18M6 6l12 12", 18));
    closeBtn.addEventListener("click", function () { self.toggle(false); });
    var title = document.createElement("h1");
    title.textContent = "Everglades Lesson Finder";
    var subtitle = document.createElement("p");
    subtitle.textContent = "Search the PreK–12 Teacher Toolkit — lessons, grade levels & standards";
    header.append(closeBtn, title, subtitle);

    var grass = document.createElement("div");
    grass.className = "elf-grass";

    var body = document.createElement("div");
    body.className = "elf-body";
    this.body = body;

    var form = document.createElement("form");
    form.className = "elf-inputrow";
    var input = document.createElement("input");
    input.className = "elf-input";
    input.type = "text";
    input.placeholder = "Ask about a lesson, grade, or standard…";
    input.setAttribute("aria-label", "Ask about a lesson, grade, or standard");
    this.input = input;
    var sendBtn = document.createElement("button");
    sendBtn.className = "elf-send";
    sendBtn.type = "submit";
    sendBtn.textContent = "Send";
    this.sendBtn = sendBtn;
    form.append(input, sendBtn);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      self.submitQuery(input.value);
    });

    panel.append(header, grass, body, form);
    container.append(launcher, panel);
    this.shadow.appendChild(container);
  };

  LessonFinderWidget.prototype.toggle = function (force) {
    this.isOpen = force == null ? !this.isOpen : force;
    this.panel.classList.toggle("elf-open", this.isOpen);
    this.launcher.setAttribute("aria-expanded", String(this.isOpen));
    if (this.isOpen && !this.hasGreeted) {
      this.hasGreeted = true;
      this.addAssistantBubble(GREETING);
      this.renderQuickPrompts();
    }
    if (this.isOpen) this.input.focus();
  };

  LessonFinderWidget.prototype.renderQuickPrompts = function () {
    var chips = document.createElement("div");
    chips.className = "elf-chips";
    var self = this;
    QUICK_PROMPTS.forEach(function (prompt) {
      var chip = document.createElement("button");
      chip.className = "elf-chip";
      chip.type = "button";
      chip.textContent = prompt;
      chip.addEventListener("click", function () { self.submitQuery(prompt); });
      chips.appendChild(chip);
    });
    this.body.appendChild(chips);
    this.chipsEl = chips;
    this.scrollToBottom();
  };

  LessonFinderWidget.prototype.submitQuery = function (rawQuery) {
    var query = String(rawQuery || "").trim();
    if (!query) return;
    if (this.chipsEl) {
      this.chipsEl.remove();
      this.chipsEl = null;
    }
    this.addUserBubble(query);
    this.input.value = "";
    var self = this;
    if (this.sendBtn) this.sendBtn.disabled = true;
    fetch(API_ORIGIN + "/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query })
    })
      .then(function (res) { return res.json(); })
      .then(function (reply) {
        self.addAssistantBubble(reply.text || "Here is what I found:");
        (reply.lessons || []).forEach(function (lesson) { self.addLessonCard(lesson); });
        self.scrollToBottom();
      })
      .catch(function () {
        self.addAssistantBubble("I couldn't reach the lesson catalog just now. Please try again in a moment.");
      })
      .finally(function () {
        if (self.sendBtn) self.sendBtn.disabled = false;
      });
  };

  LessonFinderWidget.prototype.addUserBubble = function (text) {
    var bubble = document.createElement("div");
    bubble.className = "elf-bubble elf-user";
    bubble.textContent = text;
    this.body.appendChild(bubble);
    this.scrollToBottom();
  };

  LessonFinderWidget.prototype.addAssistantBubble = function (text) {
    var bubble = document.createElement("div");
    bubble.className = "elf-bubble elf-assistant";
    bubble.textContent = text;
    this.body.appendChild(bubble);
    this.scrollToBottom();
  };

  LessonFinderWidget.prototype.addLessonCard = function (lesson) {
    var card = document.createElement("div");
    card.className = "elf-card";
    var top = document.createElement("div");
    top.className = "elf-card-top";
    var cardTitle = document.createElement("h2");
    cardTitle.className = "elf-card-title";
    cardTitle.textContent = lesson.title;
    var badge = document.createElement("span");
    badge.className = "elf-badge";
    badge.textContent = lesson.gradeRange;
    top.append(cardTitle, badge);
    var summary = document.createElement("p");
    summary.className = "elf-card-summary";
    summary.textContent = lesson.summary;
    var footer = document.createElement("div");
    footer.className = "elf-card-footer";
    var standard = document.createElement("span");
    standard.className = "elf-standard";
    standard.textContent = (lesson.ngsssStandards || []).join(", ");
    var link = document.createElement("a");
    link.className = "elf-card-link";
    link.href = lessonHref(lesson);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "View lesson →";
    footer.append(standard, link);
    card.append(top, summary, footer);
    this.body.appendChild(card);
  };

  LessonFinderWidget.prototype.scrollToBottom = function () {
    var body = this.body;
    requestAnimationFrame(function () { body.scrollTop = body.scrollHeight; });
  };

  function applyFloatHostStyles(host) {
    host.style.cssText = "position:relative;z-index:2147483000;";
  }
  function applyInlineHostStyles(host) {
    host.style.cssText = "display:block;width:100%;height:100%;min-height:420px;";
  }

  function mountFloat() {
    if (document.getElementById(HOST_ID) || document.querySelector(TAG_NAME)) return;
    var host = document.createElement("div");
    host.id = HOST_ID;
    applyFloatHostStyles(host);
    document.documentElement.appendChild(host);
    new LessonFinderWidget(host, "float");
  }

  function mountInlineOnDocument() {
    if (document.getElementById(HOST_ID) || document.querySelector(TAG_NAME)) return;
    document.documentElement.style.height = "100%";
    if (document.body) {
      document.body.style.height = "100%";
      document.body.style.margin = "0";
    }
    var host = document.createElement("div");
    host.id = HOST_ID;
    applyInlineHostStyles(host);
    (document.body || document.documentElement).appendChild(host);
    new LessonFinderWidget(host, "inline");
  }

  function boot() {
    if (detectMode() === "inline") {
      mountInlineOnDocument();
      return;
    }
    if (shouldAutoMountFloat()) mountFloat();
  }

  function watchForWixNavigation() {
    var observer = new MutationObserver(function () {
      if (!shouldAutoMountFloat()) return;
      if (document.getElementById(HOST_ID) || document.querySelector(TAG_NAME)) return;
      mountFloat();
    });
    observer.observe(document.documentElement, { childList: true });
  }

  class EvergladesLessonFinderElement extends HTMLElement {
    connectedCallback() {
      var existing = document.getElementById(HOST_ID);
      if (existing) existing.remove();
      applyInlineHostStyles(this);
      if (this.shadowRoot && this.shadowRoot.childNodes.length) return;
      new LessonFinderWidget(this, "inline");
    }
  }

  if (!customElements.get(TAG_NAME)) {
    customElements.define(TAG_NAME, EvergladesLessonFinderElement);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  watchForWixNavigation();
})();
`;
}

function demoHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Everglades Literacy Program (demo host page)</title>
    <style>
      body { margin: 0; font-family: -apple-system, "Segoe UI", sans-serif; color: #1a1a1a; }
      .demo-nav {
        background: #1c95a6; color: #fff; display: flex; align-items: center;
        gap: 24px; padding: 0 24px; height: 88px;
      }
      .demo-logo {
        background: #a4c639; color: #fff; font-weight: 700; padding: 10px 16px;
        border-radius: 4px; font-size: 14px; line-height: 1.2;
      }
      .demo-nav-links {
        display: flex; gap: 20px; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase;
      }
      main { max-width: 720px; margin: 48px auto; padding: 0 24px 200px; line-height: 1.6; }
      h1 { font-size: 28px; }
      code { font-size: 0.95em; }
    </style>
  </head>
  <body>
    <div class="demo-nav">
      <div class="demo-logo">THE EVERGLADES<br />FOUNDATION</div>
      <div class="demo-nav-links">
        <span>About</span>
        <span>Our Impact</span>
        <span>Teacher Toolkit</span>
        <span>Champion Schools</span>
      </div>
    </div>
    <main>
      <h1>Teacher Toolkit</h1>
      <p>
        This page stands in for a real page on evergladesliteracy.org, so the
        Lesson Finder widget can be tested in a realistic surrounding layout.
        The widget mounts itself via a single script tag — the same snippet
        Wix Custom Code will inject on the live site.
      </p>
      <p>
        Try opening the widget in the bottom-right corner, click a quick-start
        prompt, then try typing a free-text question like
        <em>"lessons about mangroves"</em> or <em>"SC.5.L.17.1"</em>.
      </p>
    </main>
    <script src="/widget.js" defer data-elf-widget data-elf-mode="float"></script>
  </body>
</html>`;
}

function wixHtml(origin) {
  const safe = JSON.stringify(String(origin || "").replace(/\/$/, ""));
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Add Lesson Finder to Wix — Everglades Literacy</title>
    <style>
      @import url("https://fonts.googleapis.com/css2?family=Bitter:wght@700&family=Public+Sans:wght@400;500;600&display=swap");
      :root { --cypress: #16352a; --sawgrass: #7c9a4c; --teal: #2e7d74; --egret: #faf9f2; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: "Public Sans", -apple-system, sans-serif; color: var(--cypress); background: var(--egret); line-height: 1.55; }
      header { background: var(--cypress); color: var(--egret); padding: 36px 24px 28px; }
      header h1 { font-family: "Bitter", serif; font-size: 28px; margin: 0 0 8px; }
      header p { margin: 0; color: rgba(250, 249, 242, 0.78); max-width: 640px; }
      main { max-width: 760px; margin: 0 auto; padding: 32px 24px 160px; }
      h2 { font-family: "Bitter", serif; font-size: 22px; margin: 32px 0 12px; }
      ol { padding-left: 20px; }
      li { margin: 8px 0; }
      pre, code { font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; }
      pre { background: #16352a; color: #faf9f2; padding: 16px; border-radius: 12px; overflow-x: auto; font-size: 13px; position: relative; }
      .copy { position: absolute; top: 10px; right: 10px; background: #2e7d74; color: #faf9f2; border: none; border-radius: 8px; padding: 6px 10px; font: 600 12px "Public Sans", sans-serif; cursor: pointer; }
      .note { background: #fff; border: 1px solid rgba(22, 53, 42, 0.12); border-left: 4px solid var(--sawgrass); border-radius: 8px; padding: 12px 16px; font-size: 14px; }
      a { color: var(--teal); }
    </style>
  </head>
  <body>
    <header>
      <h1>Add the Lesson Finder chatbot to Wix</h1>
      <p>evergladesliteracy.org is a Wix site. Paste one script into Wix Custom Code to float the chat launcher on every page.</p>
    </header>
    <main>
      <p class="note">
        Preferred path: <strong>Settings → Custom Code</strong> (premium plan with a connected domain).
        Custom Code does not run in the Wix editor — Publish, then view the live site.
        Do not use the editor’s Embed HTML box for the floating launcher; Wix sandboxes that in an iframe.
      </p>
      <h2>1. Custom Code (floating launcher)</h2>
      <ol>
        <li>Open the Wix dashboard for evergladesliteracy.org.</li>
        <li>Go to <strong>Settings → Custom Code → + Add Custom Code</strong>.</li>
        <li>Name it <em>Everglades Lesson Finder</em>.</li>
        <li>Paste the snippet below.</li>
        <li>Add to pages: <strong>All pages</strong>, load code <strong>once</strong>. Place code in: <strong>Body – end</strong>.</li>
        <li>Click Apply, then Publish.</li>
      </ol>
      <pre id="snippet-wrap"><button class="copy" type="button" data-copy="snippet">Copy</button><code id="snippet"></code></pre>
      <h2>2. Embed a Site (inline panel, optional)</h2>
      <p>If Custom Code is unavailable, add <strong>Embed Code → Embed a Site</strong> and paste this URL. Size the box at least 380×520.</p>
      <pre><button class="copy" type="button" data-copy="iframe">Copy</button><code id="iframe-url"></code></pre>
      <h2>3. Custom Element (optional)</h2>
      <p>Tag name <code>everglades-lesson-finder</code>, source URL <code id="widget-url"></code>.
        Preview: <a href="./wix-custom-element.html">custom element demo</a>.</p>
      <p>Local demo of the floating widget: <a href="./">open the host page</a>.</p>
    </main>
    <script>
      const origin = ${safe};
      const widgetSrc = origin + "/widget.js";
      const iframeSrc = origin + "/wix-embed.html";
      document.getElementById("snippet").textContent = [
        "<script>",
        "(function () {",
        "  if (window.__elfWidgetLoaded) return;",
        "  window.__elfWidgetLoaded = true;",
        "  var s = document.createElement('script');",
        "  s.src = " + JSON.stringify(widgetSrc) + ";",
        "  s.defer = true;",
        "  s.setAttribute('data-elf-widget', '');",
        "  s.setAttribute('data-elf-mode', 'float');",
        "  (document.documentElement || document.body).appendChild(s);",
        "})();",
        "</" + "script>"
      ].join("\\n");
      document.getElementById("iframe-url").textContent = iframeSrc;
      document.getElementById("widget-url").textContent = widgetSrc;
      document.querySelectorAll(".copy").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var key = btn.getAttribute("data-copy");
          var text = key === "iframe" ? iframeSrc : document.getElementById("snippet").textContent;
          navigator.clipboard.writeText(text).then(function () {
            btn.textContent = "Copied";
            setTimeout(function () { btn.textContent = "Copy"; }, 1500);
          });
        });
      });
    </script>
    <script src="./widget.js" defer data-elf-widget></script>
  </body>
</html>`;
}

function wixEmbedHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Everglades Lesson Finder</title>
    <style>html, body { margin: 0; width: 100%; height: 100%; background: transparent; }</style>
  </head>
  <body>
    <script src="./widget.js" defer data-elf-widget data-elf-mode="inline"></script>
  </body>
</html>`;
}

function wixCustomElementHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Wix Custom Element preview — Lesson Finder</title>
    <style>
      html, body { margin: 0; height: 100%; background: #faf9f2; }
      everglades-lesson-finder { display: block; width: min(420px, 100%); height: min(560px, 100%); margin: 24px auto; }
    </style>
    <script src="./widget.js" defer></script>
  </head>
  <body>
    <everglades-lesson-finder></everglades-lesson-finder>
  </body>
</html>`;
}

function lessonDemoHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lesson Plan Demo</title>
    <style>
      @import url("https://fonts.googleapis.com/css2?family=Bitter:wght@700&family=Public+Sans:wght@400;500&display=swap");
      body {
        margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
        background: #faf9f2; font-family: "Public Sans", -apple-system, sans-serif; color: #16352a; padding: 24px;
      }
      .sheet { max-width: 560px; width: 100%; background: #ffffff; border-radius: 16px; box-shadow: 0 12px 32px rgba(22, 53, 42, 0.14); overflow: hidden; }
      .sheet-header { background: #16352a; color: #faf9f2; padding: 28px 32px; }
      .sheet-header span { display: inline-block; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #a9c07f; margin-bottom: 8px; }
      .sheet-header h1 { font-family: "Bitter", serif; font-weight: 700; font-size: 26px; margin: 0; }
      .sheet-body { padding: 32px; }
      .sheet-body p { line-height: 1.6; font-size: 15px; }
      .placeholder-block { margin-top: 20px; border: 1px dashed rgba(22, 53, 42, 0.25); border-radius: 10px; padding: 20px; color: #5c6f5e; font-size: 13px; }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="sheet-header">
        <span>Lesson Plan Demo</span>
        <h1 id="lesson-title">Everglades Literacy Lesson</h1>
      </div>
      <div class="sheet-body">
        <p>This is a placeholder page standing in for a real lesson plan document. Once a card’s lessonUrl points at a live page or PDF, that link opens instead.</p>
        <div class="placeholder-block">Lesson Plan Demo — no real content here yet.</div>
      </div>
    </div>
    <script>
      const params = new URLSearchParams(location.search);
      const title = params.get("title");
      if (title) {
        document.getElementById("lesson-title").textContent = title;
        document.title = title + " — Lesson Plan Demo";
      }
    </script>
  </body>
</html>`;
}
