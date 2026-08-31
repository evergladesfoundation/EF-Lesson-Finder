import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  getFallbackLessons,
  getFundamentalConcepts,
  conceptLabel,
  corsAllowOrigin,
  extractGrade,
  extractStandard,
  gradeBand,
  mapSheetRow,
  parseCsv,
  parseSheetCsv,
  searchLessons,
} from "../src/worker.js";

const FALLBACK_LESSONS = getFallbackLessons();
const FUNDAMENTAL_CONCEPTS = getFundamentalConcepts();

describe("fallback catalog", () => {
  it("bundles 14 Active-style lessons", () => {
    assert.equal(FALLBACK_LESSONS.length, 14);
    for (const lesson of FALLBACK_LESSONS) {
      assert.ok(lesson.id);
      assert.ok(lesson.title);
      assert.ok(lesson.summary);
      assert.ok(Array.isArray(lesson.ngsssStandards));
      assert.ok(Number.isFinite(lesson.gradeMin));
      assert.ok(Number.isFinite(lesson.gradeMax));
    }
  });
});

describe("parseCsv", () => {
  it("splits quoted fields that contain commas", () => {
    const rows = parseCsv('a,b\n"hello, world",x\n');
    assert.deepEqual(rows[0], ["a", "b"]);
    assert.deepEqual(rows[1], ["hello, world", "x"]);
  });

  it("unescapes doubled quotes", () => {
    const rows = parseCsv('"say ""hi""",2');
    assert.equal(rows[0][0], 'say "hi"');
    assert.equal(rows[0][1], "2");
  });
});

describe("gradeBand + concepts", () => {
  it("labels Pre-K, Kindergarten, Grade N, and Grades 9-12", () => {
    assert.deepEqual(gradeBand("Pre-K", -1), { gradeRange: "Pre-K", gradeMin: -1, gradeMax: -1 });
    assert.deepEqual(gradeBand("Kindergarten", 0), {
      gradeRange: "Kindergarten",
      gradeMin: 0,
      gradeMax: 0,
    });
    assert.deepEqual(gradeBand("Grade 5", 5), { gradeRange: "Grade 5", gradeMin: 5, gradeMax: 5 });
    assert.deepEqual(gradeBand("High School 9-12", 9), {
      gradeRange: "Grades 9-12",
      gradeMin: 9,
      gradeMax: 12,
    });
  });

  it("does not treat a missing Grade Sort as Kindergarten", () => {
    assert.equal(gradeBand("Grade 5", "").gradeRange, "Grade 5");
  });

  it("maps Fundamental Concept numbers 1–7", () => {
    assert.equal(conceptLabel("2"), FUNDAMENTAL_CONCEPTS[2]);
    assert.match(conceptLabel("1, 7"), /unique and valuable/);
    assert.match(conceptLabel("1, 7"), /inextricably interconnected/);
  });
});

describe("parseSheetCsv", () => {
  it("maps the master-index template and skips non-Active rows", () => {
    const path = fileURLToPath(new URL("../data/master-index-template.csv", import.meta.url));
    const csv = readFileSync(path, "utf8");
    const lessons = parseSheetCsv(csv);
    assert.equal(lessons.length, 3);
    assert.equal(lessons[0].id, "invasive-pythons-melaleuca");
    assert.equal(lessons[0].gradeRange, "Grade 5");
    assert.ok(lessons[0].topics.includes("invasive species"));
    assert.deepEqual(lessons[0].ngsssStandards, ["SC.5.L.17.1"]);
    assert.equal(lessons[0].fundamentalConcept, FUNDAMENTAL_CONCEPTS[7]);
    assert.equal(lessons[1].title, "Don't Feed the Gators!");
    assert.equal(lessons[1].gradeMin, 2);
    assert.equal(lessons[1].gradeMax, 3);
    assert.equal(lessons[2].fundamentalConcept, FUNDAMENTAL_CONCEPTS[2]);
  });

  it("drops Draft rows", () => {
    const csv = [
      "Lesson ID,Status,Grade,Grade Sort,Title of Lesson,Theme / Topic,Topic Tags,Standards (as published),Summary of Lesson,Fundamental Concepts,lessonUrl,pdfUrl",
      "keep-me,Active,Grade 4,4,Keep Me,Water,,SC.4.E.6.6,A summary,2,https://example.com,https://example.com/a.pdf",
      "skip-me,Draft,Grade 4,4,Skip Me,Water,,SC.4.E.6.6,A summary,2,https://example.com,https://example.com/b.pdf",
    ].join("\n");
    const lessons = parseSheetCsv(csv);
    assert.equal(lessons.length, 1);
    assert.equal(lessons[0].id, "keep-me");
  });

  it("mapSheetRow returns null when Status is not Active", () => {
    assert.equal(mapSheetRow({ Status: "Under review", "Title of Lesson": "X", "Lesson ID": "x" }), null);
  });
});

describe("searchLessons", () => {
  it("prompts when the query is empty", () => {
    const reply = searchLessons("   ");
    assert.equal(reply.lessons.length, 0);
    assert.match(reply.text, /topic/i);
  });

  it("finds a 5th-grade invasive species lesson", () => {
    const reply = searchLessons("Find a 5th-grade lesson on invasive species");
    assert.ok(reply.lessons.length >= 1);
    assert.equal(reply.lessons[0].id, "invasive-pythons-melaleuca");
    assert.match(reply.text, /grade 5/i);
  });

  it("finds water cycle lessons", () => {
    const reply = searchLessons("Which lessons cover the water cycle?");
    assert.ok(reply.lessons.some((l) => l.id === "water-cycle-river-of-grass"));
  });

  it("matches an NGSSS standard code", () => {
    const reply = searchLessons("SC.5.L.17.1");
    assert.equal(reply.lessons[0].id, "invasive-pythons-melaleuca");
    assert.match(reply.text, /SC\.5\.L\.17\.1/);
  });

  it("finds Don't Feed the Gators", () => {
    const reply = searchLessons(`What standards does "Don't Feed the Gators!" align with?`);
    assert.ok(reply.lessons.some((l) => l.id === "dont-feed-the-gators"));
  });

  it("finds wading birds", () => {
    const reply = searchLessons("Show me a lesson about wading birds");
    assert.ok(reply.lessons.some((l) => l.id === "wading-birds-rookery"));
  });

  it("fails politely on unknown queries", () => {
    const reply = searchLessons("xyzzy quantum origami bananas");
    assert.equal(reply.lessons.length, 0);
    assert.match(reply.text, /couldn't find/i);
  });

  it("does not match on stopwords alone", () => {
    const reply = searchLessons("what lessons cover that");
    assert.equal(reply.lessons.length, 0);
  });
});

describe("extractors + CORS", () => {
  it("extracts grades and standards", () => {
    assert.equal(extractGrade("5th-grade pythons"), 5);
    assert.equal(extractGrade("grade 4 water"), 4);
    assert.equal(extractGrade("kindergarten wetlands"), 0);
    assert.equal(extractGrade("Pre-K sorting"), -1);
    assert.equal(extractStandard("see SC.5.L.17.1 please"), "SC.5.L.17.1");
    assert.equal(extractStandard("VPK-SC.1"), "VPK-SC.1");
  });

  it("allowlists CORS origins", () => {
    const allowed =
      "https://www.evergladesliteracy.org,https://evergladesliteracy.org,http://localhost:8787,http://127.0.0.1:8787";
    assert.equal(corsAllowOrigin("https://www.evergladesliteracy.org", allowed), "https://www.evergladesliteracy.org");
    assert.equal(corsAllowOrigin("http://127.0.0.1:8787", allowed), "http://127.0.0.1:8787");
    assert.equal(corsAllowOrigin("https://evil.example", allowed), null);
    assert.equal(corsAllowOrigin("", allowed), null);
  });
});
