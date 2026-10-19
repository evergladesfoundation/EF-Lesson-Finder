# How to wire Everglades Lesson Finder

The widget you can run today searches a **static catalog in git** (Master Lesson Index — [PR #7](https://github.com/evergladesfoundation/EF-Lesson-Finder/pull/7)). n8n live sync is Phase 2 and is **not** required for those Drive folder/PDF links.

Phase 2 (not built yet) is meant to go:

```
Google Drive My Drive  (info@evergladesliteracy.org)
        │  existing n8n Google Drive credential
        ▼
n8n Cloud  WF1 (owned My Drive files, nested) → WF2 (extract / upsert)
        │
        ▼
Supabase Postgres  (`lessons` table)
        │
        ▼
n8n WF3 chatbot  ──►  later: widget POST /chat  (not built yet)
```

Instance: [evergladesfoundation.app.n8n.cloud](https://evergladesfoundation.app.n8n.cloud)

Do not put passwords or OAuth tokens in git. OAuth stays in the n8n UI.

---

## Already done

| Piece | Status |
| --- | --- |
| Google Drive OAuth | **Confirmed** — `info@evergladesliteracy.org`, credential `EF Google Drive` |
| `EF Postgres` | **Confirmed** — Supabase port 5432, SSL Require |
| `EF OpenAI` | **Confirmed** |
| Drive catalog | My Drive for that account: [https://drive.google.com/drive/u/2/my-drive](https://drive.google.com/drive/u/2/my-drive) — all owned files, including nested folders |
| Widget catalog | [PR #7](https://github.com/evergladesfoundation/EF-Lesson-Finder/pull/7) — 43 Active lessons; each `lessonUrl` is a Drive folder (not a My Drive root crawl) |
| n8n WF1/WF2 JSON | **In git** — `n8n/workflows/`. Live canvas still cannot be written from this agent (API 401 without `X-N8N-API-KEY`) |
| Cloudflare worker | Serves `widget/dist` |

---

## Wire it (in this order)

### 1. Crawl every file and folder in My Drive

**Plan:** index **all** files and folders in that account’s My Drive. You do not need a folder ID.

Catalog URL: [https://drive.google.com/drive/u/2/my-drive](https://drive.google.com/drive/u/2/my-drive)

`/u/2/` is only which Google account is selected in the browser (the third signed-in profile). Confirm the avatar is **`info@evergladesliteracy.org`**. `/my-drive` is a view, like Shared with me — it is not an ID. Do not paste `my-drive` into a Folder ID field.

WF1 uses Google Drive **Advanced Search** with **no Folder filter** (a Folder filter is not recursive):

1. Query `trashed = false and 'me' in owners`, What to Search = Files, credential `EF Google Drive`.
2. Keep PDFs and Google/Word Docs.
3. Loop Over Items (batch size 1) and call WF2 once per file.

First test keeps **Limit 25**. Turn on **Return All** only after `SELECT COUNT(*) FROM lessons;` looks right.

If Search is empty, use HTTP Request with the same Google credential:

```
GET https://www.googleapis.com/drive/v3/files
  q=trashed=false and 'me' in owners
  fields=nextPageToken,files(id,name,mimeType,parents,modifiedTime,webViewLink)
```

Primary corpus is files owned by `info@evergladesliteracy.org`. Add Shared with me only if those items are not already owned by that mailbox.

### 2. Other n8n credentials — done

`EF Google Drive`, `EF Postgres` (port **5432**, SSL Require), and `EF OpenAI` are in n8n. Create `EF Excel` / `EF Outlook` only when WF4 or mail nodes exist.

### 3. Import workflows (hard order) — **you are here**

Recreated JSON is in this PR under `n8n/workflows/`:

- [`n8n/workflows/WF2-process-lesson.json`](n8n/workflows/WF2-process-lesson.json)
- [`n8n/workflows/WF1-crawl-my-drive.json`](n8n/workflows/WF1-crawl-my-drive.json)

On [evergladesfoundation.app.n8n.cloud](https://evergladesfoundation.app.n8n.cloud): **⋯ → Import from File**. Both files have `"active": false`.

Then in n8n:

1. **WF2** first. Assign **EF Google Drive**, **EF OpenAI**, **EF Postgres** if empty. Save. Copy the ID from the URL.
2. **WF1**. Assign **EF Google Drive**. Open **Call WF2** → **From list** → the WF2 you just saved. First test keeps **Limit 25**. Save. Leave **inactive**.
3. **Execute WF1 once**. Confirm `SELECT COUNT(*) FROM lessons;` in Supabase. Then turn on **Return All**.
4. **WF3** (chatbot) is still not in this export — import it only after `lessons` has rows.

### 4. Cursor (optional, for agents)

After merge (or with this branch checked out), `.cursor/mcp.json` lists n8n and Google Drive MCP. In Cursor Desktop: **Customize → MCP** and complete OAuth if prompted. Cloud Agents cannot finish that browser window. The crawl in step 3 does not need Cursor OAuth.

If you merge PRs [#3](https://github.com/evergladesfoundation/EF-Lesson-Finder/pull/3)–[#6](https://github.com/evergladesfoundation/EF-Lesson-Finder/pull/6), keep **one** `.cursor/mcp.json` with `n8n`, `supabase`, and `google-drive` under `mcpServers`.

### 5. Widget (not wired to n8n yet)

```bash
npm --prefix widget ci
npm --prefix widget run dev
```

Search still uses the git catalog (PR #7 Master Index until Phase 2). `widget/src/search.ts` is written so you can later swap it for `POST /chat` against WF3.

---

## Sanity checks

| Check | Passes when |
| --- | --- |
| Google / Postgres / OpenAI | **Confirmed** in n8n |
| Drive catalog | All owned files in My Drive (`/u/2/my-drive`); WF1 Advanced Search, no Folder filter |
| Postgres | Port 5432 + SSL Require; `lessons` count &gt; 0 after WF1 |
| WF1 → WF2 | Sub-workflow picked **From list** on this instance |
| Chat | WF3 returns a real lesson before you activate it |
| Widget | Still mock until Phase 2 `POST /chat` |
