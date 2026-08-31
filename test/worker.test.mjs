import assert from "node:assert/strict";
import test from "node:test";

import worker, { getFallbackLessons } from "../src/worker.js";

const FALLBACK_LESSONS = getFallbackLessons();

const env = { SHEET_CSV_URL: "", ALLOWED_ORIGINS: "*", API_KEY: "test-key" };

async function call(path, options = {}) {
  const url = new URL(path, "https://lessonfinder.test");
  return worker.fetch(new Request(url, options), env);
}

test("GET /health reports fallback catalog", async () => {
  const res = await call("/health");
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.catalog, "fallback");
  assert.equal(body.lessons, FALLBACK_LESSONS.length);
});

test("POST /api/search returns lesson cards", async () => {
  const res = await call("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "Find a 5th-grade lesson on invasive species" }),
  });
  const body = await res.json();
  assert.equal(body.catalogSource, "fallback");
  assert.ok(body.lessons.some((l) => l.id === "invasive-pythons-melaleuca"));
});

test("GET /widget.js and / are servable", async () => {
  const script = await call("/widget.js");
  const js = await script.text();
  assert.match(script.headers.get("content-type"), /javascript/);
  assert.match(js, /Everglades Lesson Finder/);
  const page = await call("/");
  assert.match(await page.text(), /Teacher Toolkit/);
});

test("GET /wix.html fills the live origin", async () => {
  const res = await call("/wix.html");
  const html = await res.text();
  assert.match(html, /https:\/\/lessonfinder\.test/);
  assert.match(html, /Custom Code/);
});

test("CORS reflects allowlisted origin and allows framing", async () => {
  const res = await worker.fetch(
    new Request("https://lessonfinder.test/api/lessons", {
      headers: { Origin: "https://www.evergladesliteracy.org" },
    }),
    {
      SHEET_CSV_URL: "",
      ALLOWED_ORIGINS: "https://www.evergladesliteracy.org,https://evergladesliteracy.org",
    },
  );
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://www.evergladesliteracy.org");
  assert.match(res.headers.get("Content-Security-Policy") || "", /frame-ancestors \*/);
  assert.equal(res.headers.get("X-Frame-Options"), null);
});

test("widget.js mounts on html and supports Wix modes", async () => {
  const js = await (await call("/widget.js")).text();
  assert.match(js, /document\.documentElement\.appendChild/);
  assert.match(js, /everglades-lesson-finder/);
  assert.match(js, /data-elf-mode/);
  assert.match(js, /\/api\/search/);
});

test("POST /api/refresh requires API_KEY", async () => {
  const denied = await call("/api/refresh", { method: "POST" });
  assert.equal(denied.status, 401);
  const ok = await call("/api/refresh", {
    method: "POST",
    headers: { "X-API-Key": "test-key" },
  });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).ok, true);
});
