import { LESSONS } from "./data/lessons";
import type { ChatReply, Lesson } from "./types";

const MAX_RESULTS = 4;

const GRADE_WORDS: Record<string, number> = {
  prek: -1,
  "pre-k": -1,
  preschool: -1,
  kindergarten: 0,
  k: 0,
};

const STANDARD_PATTERN = /\b([A-Z]{2}(?:\.\d+){2,3}\.\d+|VPK-SC\.\d+)\b/i;

// Question scaffolding, not lesson content — stripped before keyword matching
// so a query doesn't match a lesson on a word like "what" or "cover" alone.
const STOPWORDS = new Set([
  "the", "and", "about", "find", "a", "an", "lesson", "lessons", "show", "me",
  "what", "which", "does", "align", "with", "cover", "covers", "for", "who",
  "how", "that", "this", "from", "into", "near", "is", "are", "to", "of", "on",
  "in", "grade", "graders",
]);

// A single generic word (e.g. "safety") can coincidentally overlap an
// unrelated lesson's tags — that's a false match, not a real signal. A word
// this long is specific enough (e.g. "mangroves", "invasive") to stand alone;
// shorter words need a second corroborating match before we trust them.
const STRONG_WORD_LENGTH = 7;
const MIN_KEYWORD_MATCHES = 2;

function extractGrade(query: string): number | null {
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

function describeMatches(
  matches: Lesson[],
  filters: { grade: number | null; standard: string | null },
): string {
  const lead = matches.length === 1 ? "Here's a lesson" : `Here are ${matches.length} lessons`;

  if (filters.standard) {
    return `${lead} aligned with ${filters.standard}:`;
  }
  if (filters.grade !== null) {
    const gradeLabel = filters.grade === -1 ? "PreK" : filters.grade === 0 ? "Kindergarten" : `grade ${filters.grade}`;
    return `${lead} for ${gradeLabel}:`;
  }
  return `${lead} from the Teacher Toolkit:`;
}
