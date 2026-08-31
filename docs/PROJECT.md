# Project instructions

Internal notes for anyone (human or agent) changing the Everglades Lesson Finder.

## Purpose

A chat helper in the corner of [evergladesliteracy.org](https://www.evergladesliteracy.org) that helps teachers find lessons in the PreK–12 Teacher Toolkit by topic, grade, NGSSS standard, or Fundamental Concept.

A lesson nobody can find is a lesson nobody teaches. The education team already authors strong material; this worker makes it searchable without changing how they work.

## The app is one file

`src/worker.js` is the entire application:

- Sheet CSV fetch + in-memory cache
- Structured search (`searchLessons`)
- `/widget.js` chat UI (shadow DOM)
- Demo host, Wix install pages, lesson placeholder
- `/api/search`, `/api/lessons`, `/api/refresh`, `/health`

Export pure helpers (`searchLessons`, `parseSheetCsv`, …) so `npm test` can import them. Keep `export default { fetch }` as the Worker entry.

Do not reintroduce a Vite/TypeScript `widget/` package, n8n, or Supabase unless a human explicitly asks.

## What not to change

- **Brand tokens:** Cypress `#16352a`, Sawgrass `#7c9a4c`, Teal `#2e7d74`, Egret `#faf9f2`. Fonts: Bitter + Public Sans.
- **Shadow DOM isolation** so the host site and the widget cannot restyle each other.
- **Wix mount:** attach the floating host to `<html>`, not `<body>`. Remount if client-side navigation removes it. Support `data-elf-mode="inline"` and `<everglades-lesson-finder>`.
- **Fail open:** if the live Sheet is unreachable, serve the bundled fallback catalog. Teachers never see an error wall.
- **Search stays structured** (grade / standard / keyword scoring). Do not replace it with an unconstrained LLM.
- **Worker name** stays `lessonfinder`.

## Sheet ownership

The Master Lesson Index is owned by the education team. This worker **reads** a published CSV (`SHEET_CSV_URL`). It never writes the Sheet and never overwrites human-authored columns:

- Title of Lesson
- Summary of Lesson
- Standards (as published)
- Fundamental Concepts
- Topic Tags
- Theme / Topic

Only `Status = Active` rows are served. Draft / Under review rows stay in the Sheet and stay invisible to teachers.

Column names for a fresh Sheet are in `data/master-index-template.csv` (File → Import).

Fundamental Concepts (1–7):

1. The Everglades is unique and valuable.
2. The Everglades is defined and connected by water.
3. The Everglades is shaped by southern Florida's geology and geography.
4. The Everglades influences and is influenced by weather and climate.
5. The Everglades supports and is connected by a great diversity of life and ecosystems.
6. The Everglades has experienced many changes over time and is endangered.
7. The Everglades and people are inextricably interconnected.

## How to extend the worker

1. Change search, CSV mapping, routes, or UI in `src/worker.js`.
2. Update `test/*.test.mjs` when matching or parsing changes.
3. Run `npm test`.
4. For visual changes, `npm run screenshots` and commit `assets/screenshots/`.
5. Deploy: see `docs/DEPLOYMENT.md`.

Stay inside this Lesson Finder. Do not expand into curriculum authoring, auth, analytics, or a multi-file frontend unless asked.
