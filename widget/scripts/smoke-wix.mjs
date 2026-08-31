import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const widgetRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const root = join(widgetRoot, "dist");
const chrome =
  process.env.CHROME_PATH ||
  ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/local/bin/google-chrome"].find(
    (bin) => existsSync(bin),
  );

if (!chrome) {
  console.error("Chrome is required for Wix smoke tests");
  process.exit(1);
}

const require = createRequire(import.meta.url);
try {
  require.resolve("puppeteer-core");
} catch {
  const install = spawnSync("npm", ["install", "--no-save", "puppeteer-core@23"], {
    cwd: widgetRoot,
    stdio: "inherit",
  });
  if (install.status !== 0) process.exit(install.status ?? 1);
}

const puppeteer = require("puppeteer-core");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  const filePath = normalize(join(root, url.pathname === "/" ? "index.html" : url.pathname));
  if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  res.writeHead(200, {
    "content-type": MIME[extname(filePath)] ?? "application/octet-stream",
    "access-control-allow-origin": "*",
    "content-security-policy": "frame-ancestors *",
  });
  res.end(readFileSync(filePath));
});

await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
const { port } = server.address();
const origin = `http://127.0.0.1:${port}`;

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});

async function waitFor(page, fn, timeout = 5000) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    last = await page.evaluate(fn);
    if (last) return last;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`timed out waiting; last=${JSON.stringify(last)}`);
}

let failed = false;
function check(label, ok, detail) {
  if (ok) {
    console.log(`ok  ${label}`);
    return;
  }
  failed = true;
  console.error(`FAIL ${label}${detail ? `: ${detail}` : ""}`);
}

const floatPage = await browser.newPage();
await floatPage.goto(`${origin}/`, { waitUntil: "networkidle0" });
const floatInfo = await waitFor(floatPage, () => {
  const host = document.getElementById("everglades-lesson-finder-host");
  if (!host?.shadowRoot) return null;
  return {
    parent: host.parentElement?.tagName ?? null,
    hasLauncher: Boolean(host.shadowRoot.querySelector(".elf-launcher")),
    panelOpen: Boolean(host.shadowRoot.querySelector(".elf-panel.elf-open")),
  };
});
check("float host mounts on <html>", floatInfo.parent === "HTML");
check("float launcher is present", floatInfo.hasLauncher);
check("float panel starts closed", floatInfo.panelOpen === false);

await floatPage.evaluate(() => {
  const host = document.getElementById("everglades-lesson-finder-host");
  host?.shadowRoot?.querySelector(".elf-launcher")?.click();
});
const opened = await waitFor(floatPage, () => {
  const host = document.getElementById("everglades-lesson-finder-host");
  const root = host?.shadowRoot;
  if (!root?.querySelector(".elf-panel.elf-open")) return null;
  return {
    greeting: root.querySelector(".elf-assistant")?.textContent ?? "",
    chips: root.querySelectorAll(".elf-chip").length,
  };
});
check("opening launcher greets the teacher", opened.greeting.includes("Everglades Literacy"));
check("quick prompts appear", opened.chips === 4);

await floatPage.evaluate(() => {
  const host = document.getElementById("everglades-lesson-finder-host");
  host?.shadowRoot?.querySelector(".elf-chip")?.click();
});
const search = await waitFor(floatPage, () => {
  const host = document.getElementById("everglades-lesson-finder-host");
  const cards = host?.shadowRoot?.querySelectorAll(".elf-card") ?? [];
  if (cards.length === 0) return null;
  return {
    count: cards.length,
    title: cards[0]?.querySelector(".elf-card-title")?.textContent ?? "",
  };
});
check("quick prompt returns lesson cards", search.count > 0);
check("invasive-species prompt finds Pythons lesson", search.title.includes("Pythons"));

await floatPage.evaluate(() => {
  document.getElementById("everglades-lesson-finder-host")?.remove();
});
const remounted = await waitFor(floatPage, () => {
  const host = document.getElementById("everglades-lesson-finder-host");
  return host?.parentElement?.tagName === "HTML";
});
check("Wix navigation remounts the floating host", remounted === true);
await floatPage.close();

const embedPage = await browser.newPage();
await embedPage.goto(`${origin}/wix-embed.html`, { waitUntil: "networkidle0" });
const embedInfo = await waitFor(embedPage, () => {
  const host = document.getElementById("everglades-lesson-finder-host");
  const root = host?.shadowRoot;
  if (!root) return null;
  return {
    inline: Boolean(root.querySelector(".elf-inline .elf-panel")),
    launcherHidden: getComputedStyle(root.querySelector(".elf-launcher")).display === "none",
  };
});
check("iframe embed opens inline panel", embedInfo.inline);
check("iframe embed hides floating launcher", embedInfo.launcherHidden);
await embedPage.close();

const elementPage = await browser.newPage();
await elementPage.goto(`${origin}/wix-custom-element.html`, { waitUntil: "networkidle0" });
const elementInfo = await waitFor(elementPage, () => {
  const el = document.querySelector("everglades-lesson-finder");
  const root = el?.shadowRoot;
  if (!root) return null;
  return {
    defined: customElements.get("everglades-lesson-finder") != null,
    noFloatHost: document.getElementById("everglades-lesson-finder-host") == null,
    inline: Boolean(root.querySelector(".elf-inline .elf-panel")),
    greeting: root.querySelector(".elf-assistant")?.textContent ?? "",
  };
});
check("custom element is defined", elementInfo.defined);
check("custom element does not also float", elementInfo.noFloatHost);
check("custom element fills its box", elementInfo.inline);
check("custom element greets immediately", elementInfo.greeting.includes("Everglades Literacy"));
await elementPage.close();

const installPage = await browser.newPage();
await installPage.goto(`${origin}/wix.html`, { waitUntil: "networkidle0" });
const snippet = await waitFor(installPage, () => {
  const text = document.getElementById("snippet")?.textContent ?? "";
  return text.includes("/widget.js") ? text : null;
});
check("install page fills Custom Code snippet", snippet.includes("data-elf-widget"));
check("install page uses this origin", snippet.includes(origin));
await installPage.close();

const clipPage = await browser.newPage();
await clipPage.goto(`${origin}/wix-clip-test.html`, { waitUntil: "networkidle0" });
const clipInfo = await waitFor(clipPage, () => {
  const host = document.getElementById("everglades-lesson-finder-host");
  const group = document.querySelector(".wix-page-group");
  if (!host || !group) return null;
  return {
    parent: host.parentElement?.tagName ?? null,
    outsideGroup: !group.contains(host),
  };
});
check("clip test host is on <html>", clipInfo.parent === "HTML");
check("clip test host is outside Wix page group", clipInfo.outsideGroup);
await clipPage.close();

await browser.close();
server.close();
if (failed) process.exit(1);
console.log("Wix smoke tests ok");
