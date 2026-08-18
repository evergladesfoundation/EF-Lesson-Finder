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

### 1. Crawl every file and folder Shared with me

**Plan:** index **all** files and folders visible to `info@evergladesliteracy.org`, not one Toolkit folder ID. You do not need a folder ID.

They appear in Drive at [Shared with me](https://drive.google.com/drive/shared-with-me). That URL is a view, not an ID.

`sharedWithMe = true` only returns **top-level** shares. Files inside those folders are not in that list. WF1 must recurse:

1. **List roots** — Google Drive Search, Advanced Search, query `sharedWithMe = true and trashed = false`, Return All on. Credential: existing `EF Google Drive`.
2. **Split** — folders vs files.
3. **Files** — send each to WF2.
4. **Folders** — for each folder ID, Search with `'FOLDER_ID' in parents and trashed = false`, plus `includeItemsFromAllDrives=true` and `supportsAllDrives=true` (HTTP Request node if the Drive node omits those flags). Repeat until there are no nested folders.

If Search 404s or is empty, use HTTP Request with the same Google credential:

```
GET https://www.googleapis.com/drive/v3/files
  q=sharedWithMe=true and trashed=false
  includeItemsFromAllDrives=true
  supportsAllDrives=true
  corpora=allDrives
  fields=nextPageToken,files(id,name,mimeType,parents,modifiedTime)
```

Children of a folder: same call with `q='FOLDER_ID' in parents and trashed=false`.

If Shared with me is empty, the **owner** has not shared items with `info@evergladesliteracy.org`. Share the parent folders (or a Shared drive) with that address as Viewer; do not share file-by-file if the plan is “everything.”

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
2. **WF1**. Assign `EF Google Drive` + `EF Postgres` (+ OpenAI if on the canvas). Open **Execute Sub-workflow** → **From list → WF2**. Drive crawl = all Shared with me files **and** recurse into folders (step 1). No folder ID. Save. Leave **inactive**.
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
| Drive catalog | All files and nested folders in Shared with me; WF1 recurses (not a single folder ID) |
| Postgres | Port 5432 + SSL Require; `lessons` count &gt; 0 after WF1 |
| WF1 → WF2 | Sub-workflow picked **From list** on this instance |
| Chat | WF3 returns a real lesson before you activate it |
| Widget | Still mock until Phase 2 `POST /chat` |
