#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
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

const tmp = mkdtempSync(path.join(tmpdir(), "elf-search-"));
const outfile = path.join(tmp, "search.mjs");
const urlOutfile = path.join(tmp, "lessonUrls.mjs");

function bundle(entry, dest) {
  const bundled = spawnSync(
    esbuildBin,
    [entry, "--bundle", "--format=esm", "--platform=neutral", `--outfile=${dest}`],
    { encoding: "utf8" },
  );
  if (bundled.status !== 0) {
    console.error(bundled.stderr || bundled.stdout);
    process.exit(bundled.status ?? 1);
  }
}

bundle(path.join(widgetRoot, "src/search.ts"), outfile);
bundle(path.join(widgetRoot, "src/lessonUrls.ts"), urlOutfile);

const { LESSONS, extractGrade, searchLessons } = await import(pathToFileURL(outfile).href);
const { lessonPlanDownloadUrl, lessonPlanViewUrl } = await import(pathToFileURL(urlOutfile).href);

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
assert(
  LESSONS.some((l) => l.pdfUrl.includes("export=download")),
  "catalog pdfUrl may stay as Drive download; the UI helper rewrites View lesson",
);

const sampleDownload = {
  pdfUrl: "https://drive.google.com/uc?export=download&id=15HOjNaBiNJ2E7UZM-s5GJmKtcPOjy8uI",
  lessonUrl: "https://drive.google.com/drive/folders/1xOgP3K4Ep4Nn0W3uTlF6RXFd-pN2yH7Q",
};
const sampleView = lessonPlanViewUrl(sampleDownload);
assert(
  sampleView === "https://drive.google.com/file/d/15HOjNaBiNJ2E7UZM-s5GJmKtcPOjy8uI/view",
  `download pdfUrl should become a Drive view URL, got: ${sampleView}`,
);
assert(!sampleView.includes("export=download"), "View lesson helper must not use export=download");

const folderOnly = lessonPlanViewUrl({
  pdfUrl: "",
  lessonUrl: "https://drive.google.com/drive/folders/1gHYfIM6Tmrln1MsyNqs3EUT9BaNC52TF",
});
assert(
  folderOnly === "https://drive.google.com/drive/folders/1gHYfIM6Tmrln1MsyNqs3EUT9BaNC52TF",
  `missing pdfUrl should fall back to lessonUrl folder, got: ${folderOnly}`,
);

const alreadyView = lessonPlanViewUrl({
  pdfUrl: "https://drive.google.com/file/d/abc123/view",
  lessonUrl: "",
});
assert(
  alreadyView === "https://drive.google.com/file/d/abc123/view",
  `existing /file/d/ view URL should be preserved, got: ${alreadyView}`,
);

assert(
  lessonPlanDownloadUrl(sampleDownload) === sampleDownload.pdfUrl,
  "Download should use the catalog pdfUrl export=download link",
);
assert(
  lessonPlanDownloadUrl({ pdfUrl: "" }) === "",
  "Download should be hidden when pdfUrl is empty",
);

const mainSrc = readFileSync(path.join(widgetRoot, "src/main.ts"), "utf8");
assert(
  mainSrc.includes("We're Online!") && mainSrc.includes("How may I help you today?"),
  "launcher greeting is missing from main.ts",
);
assert(mainSrc.includes("View lesson →"), "View lesson label is missing from main.ts");
assert(mainSrc.includes("Download"), "Download label is missing from main.ts");

for (const lesson of LESSONS) {
  const href = lessonPlanViewUrl(lesson);
  assert(href.startsWith("https://"), `View lesson href missing for ${lesson.id}: ${href}`);
  assert(
    !/export=download/i.test(href),
    `View lesson href must not force download (${lesson.id}): ${href}`,
  );
  const download = lessonPlanDownloadUrl(lesson);
  if (lesson.pdfUrl.trim()) {
    assert(
      download.includes("export=download") || download.startsWith("https://"),
      `Download href missing for ${lesson.id}: ${download}`,
    );
  } else {
    assert(download === "", `Download should be empty without pdfUrl (${lesson.id})`);
  }
}

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
