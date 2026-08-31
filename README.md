# Everglades Lesson Finder

A chat helper for the [Everglades Literacy](https://www.evergladesliteracy.org) Teacher Toolkit. Teachers ask by topic, grade, NGSSS standard, or Fundamental Concept; the widget returns lesson cards (title, grade, summary, standard, link).

The whole app is **one Cloudflare Worker** — no Vite build, no always-on server. If the live Google Sheet is unreachable, a bundled catalog is served so teachers never hit an error wall.

## Quick start

```bash
npm i
npm run dev
```

Open [http://127.0.0.1:8787](http://127.0.0.1:8787). Click the chat button in the corner, then a quick prompt (for example “Find a 5th-grade lesson on invasive species”).

`SHEET_CSV_URL` is empty by default, so local dev uses the 14-lesson fallback catalog. That is expected.

| Script | What it does |
| --- | --- |
| `npm run dev` | `wrangler dev` — local Worker on port 8787 |
| `npm run deploy` | `wrangler deploy` — Cloudflare Worker `lessonfinder` |
| `npm run secret:key` | Store `API_KEY` (gates `POST /api/refresh`) |
| `npm run screenshots` | Playwright captures of the widget → `assets/screenshots/` |
| `npm test` | `node:test` search + CSV parser tests |

## Repo map

```
everglades-lesson-finder/
├── README.md                       ← you are here
├── wrangler.toml                   ← deploy config (Sheet URL, allowed origins)
├── package.json                    ← npm run dev / deploy / secret:key / screenshots
├── src/
│   ├── worker.js                   ← the entire app
│   └── index.js                    ← Cloudflare entry (default-export only)
├── embed-snippet.html              ← paste into Wix Custom Code
├── data/master-index-template.csv  ← File → Import into Google Sheets
├── docs/
│   ├── DEPLOYMENT.md               ← Cloudflare + Sheet + Wix steps
│   └── PROJECT.md                  ← internal product / agent instructions
├── tools/screenshots.mjs           ← regenerates widget screenshots
├── assets/                         ← screenshots (+ executive deck when provided)
├── test/                           ← node:test coverage for search + CSV
├── .cursor/rules/project.mdc       ← Cursor project rules
├── .gitignore
└── .dev.vars.example
```

## How the Wix embed works

evergladesliteracy.org is a Wix site. Preferred install:

1. Deploy the Worker (`npm run deploy`).
2. Copy `embed-snippet.html` (or the snippet on `/wix.html`, which fills in the live origin).
3. Wix dashboard → **Settings → Custom Code** → All pages, Body – end, load once.
4. Publish. Custom Code does not run in the Wix editor.

The script loads `/widget.js`, which mounts a shadow-DOM chat on `<html>` (Wix clips `position: fixed` inside body wrappers). Search calls `POST /api/search` on the Worker origin captured from `document.currentScript.src`.

Fallbacks: `/wix-embed.html` (iframe / inline panel) and the `<everglades-lesson-finder>` custom element. Details in `docs/DEPLOYMENT.md`.

## How the Sheet is wired

The education team owns the Master Lesson Index. The worker **only reads** it.

1. Publish the Sheet tab as CSV (File → Share → Publish to web).
2. Put that URL in `wrangler.toml` as `SHEET_CSV_URL` and redeploy.
3. The worker fetches, parses, and caches Active rows for ~5 minutes.
4. Human-authored columns are never written back.

Column names match `data/master-index-template.csv`. Only `Status = Active` is served. Mapping, search scoring, and the fallback catalog all live in `src/worker.js`.
