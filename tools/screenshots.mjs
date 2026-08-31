#!/usr/bin/env node
/**
 * Capture widget screenshots against a running Lesson Finder Worker.
 *
 *   ELF_BASE_URL=http://127.0.0.1:8787 npm run screenshots
 *
 * If nothing is listening on ELF_BASE_URL, this script spawns `wrangler dev`
 * and leaves it running.
 */

import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "assets", "screenshots");
const BASE = (process.env.ELF_BASE_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
const PORT = Number(new URL(BASE).port || 8787);

async function isUp() {
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForUp(ms = 45000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (await isUp()) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function maybeSpawnWrangler() {
  if (await isUp()) return null;
  const child = spawn(
    "npx",
    ["wrangler", "dev", "--port", String(PORT), "--ip", "127.0.0.1"],
    { cwd: ROOT, stdio: "inherit", env: process.env },
  );
  if (!(await waitForUp())) {
    throw new Error(`Worker did not become ready at ${BASE}`);
  }
  return child;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const spawned = await maybeSpawnWrangler();

  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage", "--no-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForSelector("#everglades-lesson-finder-host", { state: "attached" });

  await page.screenshot({ path: join(OUT_DIR, "launcher.png"), fullPage: false });

  await page.evaluate(() => {
    const root = document.getElementById("everglades-lesson-finder-host")?.shadowRoot;
    root?.querySelector(".elf-launcher")?.click();
  });
  await page.locator("#everglades-lesson-finder-host").evaluate((host) => {
    const panel = host.shadowRoot?.querySelector(".elf-panel.elf-open");
    if (!panel) throw new Error("panel did not open");
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT_DIR, "panel-greeting.png"), fullPage: false });

  await page.evaluate(() => {
    const root = document.getElementById("everglades-lesson-finder-host")?.shadowRoot;
    const chip = [...(root?.querySelectorAll(".elf-chip") || [])].find((el) =>
      (el.textContent || "").includes("invasive"),
    );
    chip?.click();
  });
  await page.waitForFunction(() => {
    const root = document.getElementById("everglades-lesson-finder-host")?.shadowRoot;
    return Boolean(root?.querySelector(".elf-card"));
  }, { timeout: 10000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT_DIR, "results-cards.png"), fullPage: false });

  await browser.close();
  if (spawned) {
    console.log(`Left wrangler dev running (pid ${spawned.pid}) at ${BASE}`);
  }
  console.log(`Wrote screenshots to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
