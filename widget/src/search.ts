import { LESSONS } from "./data/lessons";
import type { ChatReply, Lesson } from "./types";

const MAX_RESULTS = 4;

const GRADE_WORDS: Record<string, number> = {
  prek: -1,
  "pre-k": -1,
  preschool: -1,
  prekindergarten: -1,
  vpk: -1,
  kindergarten: 0,
  k: 0,
};

// NGSSS (SC.3.L.15.1), B.E.S.T. ELA (ELA.3.R.2.2), and similar dotted codes.
const STANDARD_PATTERN = /\b([A-Z]{2,4}(?:\.[A-Z0-9]+)+(?:\.[a-z])?)\b/i;

// Question scaffolding, not lesson content — stripped before keyword matching
// so a query doesn't match a lesson on a word like "what" or "cover" alone.
const STOPWORDS = new Set([
  "the", "and", "about", "find", "a", "an", "lesson", "lessons", "show", "me",
  "what", "which", "does", "align", "with", "cover", "covers", "for", "who",
  "how", "that", "this", "from", "into", "near", "is", "are", "to", "of", "on",
  "in", "grade", "graders",
  // Domain words that appear in almost every title or fallback summary.
  "everglades", "florida", "literacy", "toolkit", "teacher", "unit",
]);

// A single generic word (e.g. "safety") can coincidentally overlap an
// unrelated lesson's tags — that's a false match, not a real signal. A word
// this long is specific enough (e.g. "mangroves", "invasive") to stand alone;
// shorter words need a second corroborating match before we trust them.
const STRONG_WORD_LENGTH = 7;
const TITLE_WORD_LENGTH = 5;
const MIN_KEYWORD_MATCHES = 2;

const GRADE_WORD_ENTRIES = Object.entries(GRADE_WORDS).sort(
  (a, b) => b[0].length - a[0].length,
);

function extractGrade(query: string): number | null {
  const lower = query.toLowerCase();

  if (/\bhigh[\s-]*school\b/.test(lower) || /\b9\s*-\s*12\b/.test(lower)) {
    return 9;
  }

  for (const [word, grade] of GRADE_WORD_ENTRIES) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`, "i").test(lower)) return grade;
  }

  const ordinal = lower.match(/(\d{1,2})(st|nd|rd|th)?[\s-]*grade/);
  if (ordinal) return parseInt(ordinal[1], 10);

  const shortForm = lower.match(/\bgrade[\s-]*(\d{1,2})\b/);
  if (shortForm) return parseInt(shortForm[1], 10);

  return null;
}

function extractStandard(query: string): string | null {
  const match = query.match(STANDARD_PATTERN);
  return match ? match[1].toUpperCase() : null;
}

// Mirrors the eventual search_lessons tool: turns free text into structured
// filters (grade, standard, keyword) rather than doing pure fuzzy matching.
// Swap this module's internals for a POST /chat call once Phase 2 backend exists.
export function searchLessons(query: string): ChatReply {
  const trimmed = query.trim();
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

  const scored = LESSONS.map((lesson) => {
    let score = 0;

    if (standard && lesson.ngsssStandards.some((s) => s.toUpperCase() === standard)) {
      score += 10;
    }

    if (grade !== null && grade >= lesson.gradeMin && grade <= lesson.gradeMax) {
      score += 3;
    }

    const haystack = [
      lesson.title,
      lesson.summary,
      lesson.fundamentalConcept,
      ...lesson.topics,
      ...lesson.ngsssStandards,
    ]
      .join(" ")
      .toLowerCase();

    const titleHay = lesson.title.toLowerCase();
    const matchedWords = words.filter((w) => haystack.includes(w));
    const titleHits = words.filter((w) => titleHay.includes(w));
    const hasStrongWord = matchedWords.some((w) => w.length >= STRONG_WORD_LENGTH);
    const hasTitleWord = titleHits.some((w) => w.length >= TITLE_WORD_LENGTH);
    if (matchedWords.length >= MIN_KEYWORD_MATCHES || hasStrongWord || hasTitleWord) {
      score += matchedWords.length + (hasTitleWord ? 2 : 0);
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

function describeMatches(
  matches: Lesson[],
  filters: { grade: number | null; standard: string | null },
): string {
  const lead = matches.length === 1 ? "Here's a lesson" : `Here are ${matches.length} lessons`;

  if (filters.standard) {
    return `${lead} aligned with ${filters.standard}:`;
  }
  if (filters.grade !== null) {
    const allHighSchool = matches.every((m) => m.gradeMin >= 9);
    const gradeLabel =
      filters.grade === -1
        ? "Pre-K"
        : filters.grade === 0
          ? "Kindergarten"
          : allHighSchool
            ? "high school"
            : `grade ${filters.grade}`;
    return `${lead} for ${gradeLabel}:`;
  }
  return `${lead} from the Teacher Toolkit:`;
}
