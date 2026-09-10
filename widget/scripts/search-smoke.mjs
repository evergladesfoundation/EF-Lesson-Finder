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
const resetOutfile = path.join(tmp, "resetConversation.mjs");

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
bundle(path.join(widgetRoot, "src/resetConversation.ts"), resetOutfile);

const { LESSONS, extractGrade, searchLessons } = await import(pathToFileURL(outfile).href);
const { lessonMaterialsFolderUrl, lessonPlanDownloadUrl, lessonPlanViewUrl } = await import(
  pathToFileURL(urlOutfile).href
);
const { resetConversation } = await import(pathToFileURL(resetOutfile).href);

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

const sampleFolder = lessonMaterialsFolderUrl(sampleDownload);
assert(
  sampleFolder === sampleDownload.lessonUrl,
  `folder helper should return the Drive folder URL, got: ${sampleFolder}`,
);
assert(
  /drive\.google\.com\/drive\/folders\//.test(sampleFolder),
  `folder helper should be a Drive folder URL, got: ${sampleFolder}`,
);
assert(
  lessonMaterialsFolderUrl({ lessonUrl: "" }) === "",
  "folder link should be hidden when lessonUrl is empty",
);
assert(
  lessonMaterialsFolderUrl({ lessonUrl: "https://example.com/not-a-folder" }) === "",
  "folder link should be hidden when lessonUrl is not a Drive folder",
);

const mainSrc = readFileSync(path.join(widgetRoot, "src/main.ts"), "utf8");
assert(
  mainSrc.includes("We're Online!") && mainSrc.includes("How may I help you today?"),
  "launcher greeting is missing from main.ts",
);
assert(mainSrc.includes("View lesson"), "View lesson label is missing from main.ts");
assert(mainSrc.includes("Download"), "Download label is missing from main.ts");
assert(
  mainSrc.includes("All materials →"),
  "All materials → label is missing from main.ts",
);
assert(!mainSrc.includes("View all lesson materials"), "old materials label should be gone");
assert(!mainSrc.includes("elf-grass"), "sawgrass zigzag edge should be removed");
assert(mainSrc.includes("Teacher Toolkit"), "header kicker is missing from main.ts");
assert(mainSrc.includes("Find a lesson"), "launcher pill label is missing from main.ts");
assert(!mainSrc.includes("lesson photo"), "lesson photo placeholder must be removed from list rows");
assert(!mainSrc.includes("elf-card-photo"), "elf-card-photo cell must be removed from list rows");
assert(/card\.append\(\s*content\s*\)/.test(mainSrc), "lesson card must append content only, with no photo cell");
assert(mainSrc.includes('setAttribute("aria-label", "Send")'), "send aria-label is missing");
assert(mainSrc.includes("lessonMaterialsFolderUrl"), "folder helper is not used in main.ts");
const footerCss = readFileSync(path.join(widgetRoot, "src/styles.css"), "utf8");
assert(footerCss.includes("Newsreader"), "Newsreader font is missing from styles.css");
assert(!footerCss.includes("elf-card-photo"), "photo slot styles must be removed");
assert(
  !/grid-template-columns:\s*64px/.test(footerCss),
  ".elf-card must not keep a 64px photo grid column",
);
const cardCss = footerCss.match(/\.elf-card\s*\{[^}]+\}/)?.[0] ?? "";
assert(
  /flex-direction:\s*column/.test(cardCss) && !/grid-template-columns/.test(cardCss),
  ".elf-card layout must be a single column",
);
assert(!mainSrc.includes("elf-card-footer-primary"), "footer primary row should be gone so links are not beside standards");
assert(
  /footer\.append\(\s*standard,\s*links\s*\)/.test(mainSrc),
  "standards and action links must be sibling footer rows",
);
assert(
  /flex-direction:\s*column/.test(footerCss.match(/\.elf-card-footer\s*\{[^}]+\}/)?.[0] ?? ""),
  ".elf-card-footer must stack standards above the links",
);
const linksCss = footerCss.match(/\.elf-card-links\s*\{[^}]+\}/)?.[0] ?? "";
const linkCss = footerCss.match(/\.elf-card-link\s*\{[^}]+\}/)?.[0] ?? "";
assert(
  /justify-content:\s*flex-start/.test(linksCss) && /flex-wrap:\s*wrap/.test(linksCss),
  ".elf-card-links must be left-aligned and allowed to wrap",
);
assert(
  /white-space:\s*nowrap/.test(linkCss),
  "each action link must stay on one line; only the row may wrap if the panel is too narrow",
);
assert(
  /font-size:\s*12px/.test(linkCss),
  "action links should use a slightly smaller font so all three fit on one row at widget width",
);
assert(
  /gap:\s*8px/.test(linksCss),
  ".elf-card-links gap should stay compact so View/Download/materials fit on one row",
);
assert(
  !/\.elf-card-link-materials\s*\{[^}]*align-self:\s*flex-end/.test(footerCss),
  "materials link must not be right-aligned",
);

const foodChains = LESSONS.find((l) => l.title === "Everglades Food Chains");
assert(Boolean(foodChains), "Everglades Food Chains must be in the catalog");
assert(
  JSON.stringify(foodChains?.ngsssStandards) ===
    JSON.stringify(["SC.4.L.17.3", "SC.4.L.17.4", "MAFS.K12.MP.2.1"]),
  `Everglades Food Chains must keep every NGSSS code, got: ${foodChains?.ngsssStandards.join(" · ")}`,
);
assert(
  /ngsssStandards\.join\(" · "\)/.test(mainSrc),
  'lesson cards must join every NGSSS code with " · "',
);
assert(
  !/ngsssStandards\.(slice|splice|substring|substr)/.test(mainSrc),
  "lesson cards must not drop NGSSS codes from the array",
);

const standardCss = footerCss.match(/\.elf-standard\s*\{[^}]+\}/)?.[0] ?? "";
assert(Boolean(standardCss), ".elf-standard rule is missing");
assert(
  /white-space:\s*normal/.test(standardCss) &&
    /overflow:\s*visible/.test(standardCss) &&
    /text-overflow:\s*unset/.test(standardCss),
  ".elf-standard must wrap and stay fully visible, not clip",
);
assert(
  !/text-overflow:\s*ellipsis/.test(standardCss) &&
    !/white-space:\s*nowrap/.test(standardCss) &&
    !/overflow:\s*hidden/.test(standardCss) &&
    !/line-clamp/.test(standardCss) &&
    !/-webkit-line-clamp/.test(standardCss) &&
    !/max-height/.test(standardCss),
  ".elf-standard must not ellipsize, nowrap, hide overflow, line-clamp, or cap height",
);
assert(
  !/\.elf-standard[^{]*\{[^}]*text-overflow:\s*ellipsis/.test(footerCss),
  "no .elf-standard rule may use text-overflow: ellipsis",
);

const titleCss = footerCss.match(/\.elf-card-title\s*\{[^}]+\}/)?.[0] ?? "";
const summaryCss = footerCss.match(/\.elf-card-summary\s*\{[^}]+\}/)?.[0] ?? "";
assert(
  !/text-overflow:\s*ellipsis/.test(titleCss) && !/white-space:\s*nowrap/.test(titleCss),
  "lesson titles must not be truncated as a side effect of the standards wrap fix",
);
assert(
  !/text-overflow:\s*ellipsis/.test(summaryCss) && !/white-space:\s*nowrap/.test(summaryCss),
  "lesson summaries must not be truncated as a side effect of the standards wrap fix",
);

const panelCss = footerCss.match(/\.elf-panel\s*\{[^}]+\}/)?.[0] ?? "";
const panelWidth = Number(panelCss.match(/^\s*width:\s*(\d+)px/m)?.[1] ?? 0);
const panelMaxWidth = Number(panelCss.match(/max-width:\s*min\((\d+)px/)?.[1] ?? 0);
assert(
  panelWidth >= 520 && panelWidth <= 560 && panelMaxWidth >= 520 && panelMaxWidth <= 560,
  `chat panel should be 520–560px wide so standards fit; got width=${panelWidth} max-width=${panelMaxWidth}`,
);

const toggleSrc = mainSrc.match(/private toggle\(force\?: boolean\): void \{[\s\S]*?\n  \}/)?.[0] ?? "";
const resetSrc = mainSrc.match(/private resetConversation\(\): void \{[\s\S]*?\n  \}/)?.[0] ?? "";
assert(Boolean(toggleSrc), "toggle() is missing from main.ts");
assert(Boolean(resetSrc), "resetConversation() is missing from main.ts");
assert(
  /if \(!nextOpen && this\.isOpen\)/.test(toggleSrc) && /this\.resetConversation\(\)/.test(toggleSrc),
  "closing the panel (X or launcher) must call resetConversation()",
);
assert(
  /clearTranscript\(\{ body: this\.body, input: this\.input \}\)/.test(resetSrc),
  "resetConversation() must clear the transcript via clearTranscript()",
);
assert(
  /this\.chipsEl = next\.chipsEl/.test(resetSrc) && /this\.hasGreeted = next\.hasGreeted/.test(resetSrc),
  "resetConversation() must restore chips/hasGreeted so reopen re-greets",
);
assert(
  /this\.isOpen && !this\.hasGreeted/.test(toggleSrc) &&
    /this\.addAssistantBubble\(GREETING\)/.test(toggleSrc) &&
    /this\.renderQuickPrompts\(\)/.test(toggleSrc),
  "reopening after reset must restore the greeting and quick prompts",
);
assert(
  /closeBtn\.addEventListener\("click", \(\) => this\.toggle\(false\)\)/.test(mainSrc),
  "panel X must close via toggle(false)",
);
assert(
  /launcher\.addEventListener\("click", \(\) => this\.toggle\(\)\)/.test(mainSrc),
  "launcher click must toggle open/close (close path also resets)",
);
assert(
  /greeting\.addEventListener\("click", \(\) => this\.toggle\(true\)\)/.test(mainSrc),
  "We're Online greeting still opens the panel",
);

const leftover = { nodes: ["greeting", "chips", "user", "card"] };
const body = {
  replaceChildren() {
    leftover.nodes = [];
  },
};
const input = { value: "Don't Feed the Gators" };
const reset = resetConversation({ body, input });
assert(leftover.nodes.length === 0, "resetConversation must empty the transcript body");
assert(input.value === "", "resetConversation must clear typed input");
assert(reset.chipsEl === null, "resetConversation must drop quick-prompt chips");
assert(reset.hasGreeted === false, "resetConversation must set hasGreeted false for a fresh greeting");

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
  const folder = lessonMaterialsFolderUrl(lesson);
  if (lesson.lessonUrl.trim()) {
    assert(
      folder === lesson.lessonUrl.trim() && /drive\.google\.com\/drive\/folders\//.test(folder),
      `folder href missing or not a Drive folder for ${lesson.id}: ${folder}`,
    );
    if (download) {
      assert(folder !== download, `folder href must differ from Download (${lesson.id})`);
    }
    if (/\/file\/d\//.test(href)) {
      assert(folder !== href, `folder href must differ from View lesson (${lesson.id})`);
    }
  } else {
    assert(folder === "", `folder link should be empty without lessonUrl (${lesson.id})`);
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
