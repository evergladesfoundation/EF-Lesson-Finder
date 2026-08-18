# How to wire Everglades Lesson Finder

The widget you can run today searches **mock lessons in git**. Production search is meant to go:

```
Google Drive Shared with me  (info@evergladesliteracy.org)
        │  existing n8n Google Drive credential
        ▼
n8n Cloud  WF1 (search sharedWithMe) → WF2 (extract / embed / upsert)
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
| Google Drive OAuth in n8n | **Already created** — do not add another. Confirm the Google user is `info@evergladesliteracy.org`. Rename the credential to `EF Google Drive` if it has a different name. |
| Widget (Phase 1) | Local Vite app; `widget/src/data/lessons.ts` mock catalog |
| Cloudflare worker | Serves `widget/dist` |

---

## Wire it (in this order)

### 1. Point n8n at Shared with me

The lesson plans are **not** in My Drive. They appear for `info@evergladesliteracy.org` at:

[https://drive.google.com/drive/shared-with-me](https://drive.google.com/drive/shared-with-me)

That URL is a **view**, not a folder ID. WF1 must not use a My Drive folder picker. Use one of these:

**A. Crawl everything shared with that account (default)**

On the WF1 Google Drive node:

- Resource: **File/Folder**
- Operation: **Search**
- Search Method: **Advanced Search**
- Query String: `sharedWithMe = true and trashed = false`
- Return All: on

If the node 404s or returns nothing, use an **HTTP Request** node with the same Google credential:

`GET https://www.googleapis.com/drive/v3/files?q=sharedWithMe=true and trashed=false&includeItemsFromAllDrives=true&supportsAllDrives=true&fields=nextPageToken,files(id,name,mimeType,parents,modifiedTime)`

**B. Crawl one shared folder (preferred if all plans sit in a single folder)**

Get the ID:

1. Sign in as `info@evergladesliteracy.org`.
2. Open [Shared with me](https://drive.google.com/drive/shared-with-me).
3. Double-click the lesson-plans **folder**.
4. Copy the last segment of `https://drive.google.com/drive/folders/<id>`.

That `<id>` is `GOOGLE_DRIVE_FOLDER_ID`. Paste it on the Drive node (By ID or By URL). If the bar still says `shared-with-me`, you have not opened a folder. Do not use a `/file/d/...` URL (that is a file, not a folder).

### 2. Finish the other n8n credentials

Same **Credentials** sidebar. Create only if missing:

| Name | What to attach |
| --- | --- |
| `EF Google Drive` | Existing Google credential (rename, do not duplicate) |
| `EF Postgres` | Supabase **direct or session** URI, port **5432**, SSL **Require**. Not port `6543`. Password is the database password, not `anon` / `service_role`. |
| `EF OpenAI` | API key with billing enabled |
| `EF Excel` | Foundation Microsoft account; workbook must live in **OneDrive** |
| `EF Outlook` | Same Microsoft account, if mail nodes exist |

Scratch pad for IDs (gitignored): copy `n8n/.env.example` → `n8n/.env` from [PR #5](https://github.com/evergladesfoundation/EF-Lesson-Finder/pull/5).

### 3. Import workflows (hard order)

The four JSON exports are **not in this repo yet**. In n8n: open a workflow → **⋯ → Download**, save as `n8n/workflows/WF2*.json`, `WF1*.json`, `WF4*.json`, `WF3*.json`.

Then in n8n: **⋯ → Import from File**:

1. **WF2** first (per-file processor). Assign credentials. Save. Copy its ID from the URL.
2. **WF1**. Assign `EF Google Drive` + `EF Postgres` (+ OpenAI if on the canvas). Open **Execute Sub-workflow** → **From list → WF2** (the old ID from another instance will fail). Point the Drive node at **Shared with me** (`sharedWithMe = true`) or at the shared folder ID from step 1. Save. Leave **inactive**.
3. **WF4** (Excel). Pick the workbook From list or paste the Graph item ID.
4. **Execute WF1 once** (Test workflow). Confirm `SELECT COUNT(*) FROM lessons;` in Supabase.
5. **WF3** last (chatbot). Do not activate until `lessons` has rows.

Full click-path: `n8n/IMPORT.md` on [PR #5](https://github.com/evergladesfoundation/EF-Lesson-Finder/pull/5).

### 4. Cursor (optional, for agents)

After merge (or with this branch checked out), `.cursor/mcp.json` lists n8n and Google Drive MCP. In Cursor Desktop: **Customize → MCP** and complete OAuth if prompted. Cloud Agents cannot finish that browser window. The crawl in step 3 does not need Cursor OAuth.

If you merge PRs [#3](https://github.com/evergladesfoundation/EF-Lesson-Finder/pull/3)–[#6](https://github.com/evergladesfoundation/EF-Lesson-Finder/pull/6), keep **one** `.cursor/mcp.json` with `n8n`, `supabase`, and `google-drive` under `mcpServers`.

### 5. Widget (not wired to n8n yet)

```bash
npm --prefix widget ci
npm --prefix widget run dev
```

Search still uses mock data. `widget/src/search.ts` is written so you can later swap it for `POST /chat` against WF3. Do not point the embed at n8n until step 3 has a populated `lessons` table and a working WF3 test chat.

---

## Sanity checks

| Check | Passes when |
| --- | --- |
| Google | Existing n8n credential; user is `info@evergladesliteracy.org` |
| Drive catalog | Shared with me for `info@evergladesliteracy.org`; WF1 uses `sharedWithMe = true` or a real `/folders/<id>` URL |
| Postgres | Port 5432 + SSL Require; `lessons` count &gt; 0 after WF1 |
| WF1 → WF2 | Sub-workflow picked **From list** on this instance |
| Chat | WF3 returns a real lesson before you activate it |
| Widget | Still mock until Phase 2 `POST /chat` |
