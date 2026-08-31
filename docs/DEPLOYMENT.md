# Deployment

The Lesson Finder is one Cloudflare Worker named `lessonfinder`. There is no always-on server and no Vite build step.

## 1. Cloudflare Worker

Prerequisites: a Cloudflare account and the Wrangler CLI (`npm i` from the repo root).

```bash
npm i
npx wrangler login          # first time only
npm run deploy              # wrangler deploy
```

`wrangler.toml` sets `name = "lessonfinder"` and `main = "src/worker.js"`. After deploy, the worker is typically at:

`https://lessonfinder.<your-subdomain>.workers.dev`

You can attach a custom route later in the Cloudflare dashboard.

### Refresh API key

`POST /api/refresh` busts the in-memory Sheet cache. Protect it in production:

```bash
npm run secret:key          # wrangler secret put API_KEY
```

Paste a long random string when prompted. Callers must send `X-API-Key: <key>` or `Authorization: Bearer <key>`. If `API_KEY` is unset (local default), refresh is open — that is fine for `wrangler dev`, not for production.

Do not commit `.dev.vars`. Copy `.dev.vars.example` for local overrides.

## 2. Publish the Master Lesson Index as CSV

The education team keeps the catalog in a Google Sheet (import `data/master-index-template.csv` via File → Import if you are starting fresh).

1. Open the Master Lesson Index Google Sheet.
2. File → Share → Publish to web.
3. Publish the lesson-index tab as **CSV**.
4. Copy the published URL (it should look like `https://docs.google.com/spreadsheets/d/<id>/export?format=csv&gid=<gid>` or a `/pub?output=csv` link).
5. Anyone-with-link **Viewer** is enough; the worker only reads.

Set the URL on the Worker (public var, not a secret):

```bash
npx wrangler secret put SHEET_CSV_URL
```

is **not** required — `SHEET_CSV_URL` is a `[vars]` entry in `wrangler.toml`. Edit it there and redeploy:

```toml
[vars]
SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/<id>/export?format=csv&gid=0"
```

Or override locally in `.dev.vars`.

Leave `SHEET_CSV_URL` empty to serve the bundled 14-lesson fallback catalog (this is how `npm run dev` works with no Sheet).

The worker caches the CSV in memory for about five minutes. After a Sheet edit, either wait or `POST /api/refresh` with the API key.

## 3. Wix Custom Code (evergladesliteracy.org)

The live site is Wix. Preferred install is a **floating launcher on every page**.

**Requirements**

- Premium Wix plan with a connected domain. Custom Code is not available on free sites.
- Custom Code **does not run in the Wix editor**. Publish, then check the live site.

**Steps**

1. Deploy the Worker and open `https://<worker-host>/wix.html`. The snippet on that page is filled with the live origin. You can also copy `embed-snippet.html` from this repo and swap the `src` origin.
2. Wix dashboard → **Settings → Custom Code → + Add Custom Code**.
3. Name: `Everglades Lesson Finder`.
4. Paste the snippet.
5. Add to pages: **All pages**. Load code **once**. Place code in: **Body – end**.
6. Apply, then **Publish**.

The widget mounts on `<html>` so Wix’s transformed body wrappers cannot clip `position: fixed`.

**Fallbacks** if Custom Code is unavailable

- **Embed a Site:** use `https://<worker-host>/wix-embed.html` in an Embed Code box (at least 380×520). The panel fills the iframe (`data-elf-mode="inline"`).
- **Custom Element:** tag `everglades-lesson-finder`, script URL `https://<worker-host>/widget.js`. Preview: `/wix-custom-element.html`.

## 4. CORS and framing

`ALLOWED_ORIGINS` in `wrangler.toml` is a comma-separated allowlist. It already includes:

- `https://www.evergladesliteracy.org`
- `https://evergladesliteracy.org`
- `http://localhost:8787` and `http://127.0.0.1:8787` for `wrangler dev`

HTML responses send `Content-Security-Policy: frame-ancestors *` and do not set `X-Frame-Options`, so Wix can iframe the install/embed pages.

## 5. Smoke-check after deploy

```bash
curl -s https://<worker-host>/health
curl -s https://<worker-host>/ | head
curl -s https://<worker-host>/widget.js | head
curl -s -X POST https://<worker-host>/api/search \
  -H 'content-type: application/json' \
  -d '{"query":"water cycle"}'
```

Open `/` and click the chat launcher. If the Sheet URL is set, `catalogSource` in the JSON is `"sheet"`; otherwise `"fallback"`.
