#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const widgetRoot = path.resolve(__dirname, "..");
const require = createRequire(path.join(widgetRoot, "package.json"));

let esbuildBin;
try {
  esbuildBin = require.resolve("esbuild/bin/esbuild");
} catch {
  esbuildBin = path.join(widgetRoot, "node_modules/esbuild/bin/esbuild");
}

const outfile = path.join(mkdtempSync(path.join(tmpdir(), "elf-search-")), "search.mjs");
const bundled = spawnSync(
  esbuildBin,
  [
    path.join(widgetRoot, "src/search.ts"),
    "--bundle",
    "--format=esm",
    "--platform=neutral",
    `--outfile=${outfile}`,
  ],
  { encoding: "utf8" },
);

if (bundled.status !== 0) {
  console.error(bundled.stderr || bundled.stdout);
  process.exit(bundled.status ?? 1);
}

const { LESSONS, extractGrade, searchLessons } = await import(pathToFileURL(outfile).href);

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

assert(LESSONS.length >= 40, `expected 40+ Active lessons, got ${LESSONS.length}`);

const grade4 = LESSONS.filter((l) => l.gradeMin === 4 && l.gradeMax === 4);
const grade4Titles = grade4.map((l) => l.title);
assert(grade4.length === 3, `expected 3 Grade 4 lessons, got ${grade4.length}: ${grade4Titles.join("; ")}`);
for (const title of ["Everglades Food Chains", "Wanted - Alive!", "I'm in Big Trouble!"]) {
  assert(grade4Titles.includes(title), `missing Grade 4 title: ${title}`);
}

assert(
  LESSONS.every((l) => l.pdfUrl.startsWith("https://") || l.lessonUrl.startsWith("https://")),
  "every lesson needs an https pdfUrl or lessonUrl",
);
assert(
  LESSONS.every((l) => !l.pdfUrl.includes("lesson-plan-demo") && !l.lessonUrl.includes("lesson-plan-demo")),
  "catalog must not point at lesson-plan-demo.html",
);

assert(extractGrade("lessons that talk about the water cycle") === null, 'extractGrade("talk about the water cycle") should be null');
assert(extractGrade("kindergarten") === 0, 'extractGrade("kindergarten") should be 0');
assert(extractGrade("4th grade lessons") === 4, 'extractGrade("4th grade lessons") should be 4');
assert(extractGrade("Show me 4th grade lessons") === 4, 'extractGrade("Show me 4th grade lessons") should be 4');

const fourth = searchLessons("4th grade lessons");
assert(fourth.lessons.length === 3, `4th grade search should return 3 lessons, got ${fourth.lessons.length}`);
assert(
  fourth.lessons.every((l) => l.gradeMin === 4 && l.gradeMax === 4),
  "4th grade search mixed in other grades",
);
assert(
  fourth.text.includes("grade 4") && !fourth.text.toLowerCase().includes("kindergarten"),
  `4th grade reply should name grade 4, got: ${fourth.text}`,
);
assert(
  !fourth.lessons.some((l) => /river of grass|tracing the water cycle/i.test(l.title)),
  "4th grade search returned a mock water-cycle title",
);

const water = searchLessons("lessons that talk about the water cycle");
assert(
  !/kindergarten/i.test(water.text),
  `water cycle reply should not say Kindergarten, got: ${water.text}`,
);
assert(water.lessons.length > 0, "water cycle search returned no lessons");

const gators = searchLessons("Don't Feed the Gators");
assert(
  gators.lessons.some((l) => l.title === "Don't Feed the Gators!"),
  `expected Don't Feed the Gators! in results: ${gators.lessons.map((l) => l.title).join("; ")}`,
);

if (failures.length) {
  console.error(`search-smoke failed (${failures.length}):`);
  for (const failure of failures) console.error(" -", failure);
  process.exit(1);
}

console.log(
  `search-smoke passed (${LESSONS.length} lessons; 4th grade → ${fourth.lessons.map((l) => l.title).join(", ")})`,
);
