import { LESSONS } from "./data/lessons";
import type { ChatReply, Lesson } from "./types";

export { LESSONS };

const MAX_TOPIC_RESULTS = 4;
const MAX_GRADE_RESULTS = 12;

const GRADE_WORDS: Record<string, number> = {
  prekindergarten: -1,
  preschool: -1,
  "pre-k": -1,
  prek: -1,
  vpk: -1,
  kindergarten: 0,
  k: 0,
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
  eleventh: 11,
  twelfth: 12,
};

const GRADE_ONLY_WORDS = new Set([
  ...Object.keys(GRADE_WORDS),
  "high",
  "school",
  "middle",
  "elementary",
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
  "11th",
  "12th",
]);

const GRADE_WORD_ENTRIES = Object.entries(GRADE_WORDS).sort(
  (a, b) => b[0].length - a[0].length,
);

// NGSSS (SC.3.L.15.1), B.E.S.T. ELA (ELA.3.R.2.2), and similar dotted codes.
const STANDARD_PATTERN = /\b([A-Z]{2,4}(?:\.[A-Z0-9]+)+(?:\.[a-z])?)\b/i;

const STOPWORDS = new Set([
  "the", "and", "about", "find", "a", "an", "lesson", "lessons", "show", "me",
  "what", "which", "does", "align", "with", "cover", "covers", "for", "who",
  "how", "that", "this", "from", "into", "near", "is", "are", "to", "of", "on",
  "in", "grade", "graders", "talk", "talks", "talking",
  "everglades", "florida", "literacy", "toolkit", "teacher", "unit",
  "available", "provide", "gives", "give",
]);

const STRONG_WORD_LENGTH = 7;
const TITLE_WORD_LENGTH = 5;
const MIN_KEYWORD_MATCHES = 2;

function inGradeBand(lesson: Lesson, grade: number): boolean {
  return grade >= lesson.gradeMin && grade <= lesson.gradeMax;
}

export function extractGrade(query: string): number | null {
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

function queryWords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s.-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function isGradeOnlyQuery(words: string[], grade: number | null): boolean {
  if (grade === null) return false;
  return words.every(
    (w) => GRADE_ONLY_WORDS.has(w) || /^\d+$/.test(w) || /^\d+(st|nd|rd|th)(?:-grade)?$/.test(w),
  );
}

function scoreLesson(
  lesson: Lesson,
  words: string[],
  standard: string | null,
): number {
  let score = 0;

  if (standard && lesson.ngsssStandards.some((s) => s.toUpperCase() === standard)) {
    score += 10;
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

  return score;
}

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
  const words = queryWords(trimmed);
  const gradeOnly = isGradeOnlyQuery(words, grade);

  const pool =
    grade !== null ? LESSONS.filter((lesson) => inGradeBand(lesson, grade)) : LESSONS;

  const scored = pool.map((lesson) => ({
    lesson,
    score: gradeOnly ? 1 : scoreLesson(lesson, words, standard),
  }));

  const keywordHits = scored.filter((s) => s.score > 0);
  const ranked = (keywordHits.length > 0 ? keywordHits : grade !== null ? scored : [])
    .sort((a, b) => b.score - a.score);
  const cap = gradeOnly || (grade !== null && keywordHits.length === 0)
    ? MAX_GRADE_RESULTS
    : MAX_TOPIC_RESULTS;
  const matches = ranked.slice(0, cap).map((s) => s.lesson);

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

function matchesRequestedGrade(matches: Lesson[], grade: number): boolean {
  return matches.every((m) => inGradeBand(m, grade));
}

function describeMatches(
  matches: Lesson[],
  filters: { grade: number | null; standard: string | null },
): string {
  const lead = matches.length === 1 ? "Here's a lesson" : `Here are ${matches.length} lessons`;

  if (filters.standard) {
    return `${lead} aligned with ${filters.standard}:`;
  }
  if (filters.grade !== null && matchesRequestedGrade(matches, filters.grade)) {
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
