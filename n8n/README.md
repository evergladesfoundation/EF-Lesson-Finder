# Everglades Lesson Finder — n8n setup

n8n crawls Google Drive, indexes lessons in Postgres (Supabase), and serves the multilingual chatbot. This folder is the import kit: credentials first, then workflows in a fixed order.

**Start here:** [`ACCOUNT.md`](ACCOUNT.md) (what to create) → [`.env.example`](.env.example) (values) → [`IMPORT.md`](IMPORT.md) (the sequence). Do not open the n8n editor until the Account gate is checked.

Instance: [https://evergladesfoundation.app.n8n.cloud](https://evergladesfoundation.app.n8n.cloud)

---

## What lives where

| Path | Purpose |
| --- | --- |
| [`ACCOUNT.md`](ACCOUNT.md) | Accounts, credential names, ready-to-import gate |
| [`.env.example`](.env.example) | Copy to `.env`; IDs and secrets stay local |
| [`IMPORT.md`](IMPORT.md) | One-page import order, link WF1→WF2, placeholders |
| [`workflows/`](workflows/) | The four exported workflow JSON files |
| [`schema.sql`](schema.sql) | Canonical tables (already applied — `grade_synonyms` is populated) |
| [`scripts/preflight.mjs`](scripts/preflight.mjs) | Reads JSON and lists credentials + placeholders |

---

## System map

```
Google Drive  --WF1-->  WF2 (per file)  --upsert-->  Postgres
                                              ^
OneDrive Excel --WF4-->  (catalog / tracking workbook)
                                              |
OpenAI chat    --WF3-->  search_lessons  -----+
Outlook        --notify-  failures / mail
```

| Workflow | Role | Import |
| --- | --- | --- |
| **WF2** | Sub-workflow: process one Drive file (extract, embed, upsert) | **1st** — WF1 cannot link until this exists |
| **WF1** | Crawl the Drive folder; call WF2 for each file | **2nd** — re-select WF2, then run manually to fill the DB |
| **WF4** | Excel (OneDrive) workbook | **3rd** — paste workbook ID |
| **WF3** | Multilingual chatbot | **Last** — after `lessons` has rows |

Credential types on the canvas: **Google Drive**, **Postgres**, **Microsoft Outlook**, **Microsoft Excel (OneDrive)**, **OpenAI**.

---

## 1. n8n Cloud account and API key

1. Sign in at [app.n8n.cloud](https://app.n8n.cloud) and open the Everglades instance.
2. **Settings → n8n API → Create an API key.** Label it `EF Lesson Finder`. Copy into `N8N_API_KEY`.
3. The public API is **not** available on the free trial. You can still **⋯ → Import from File** without an API key.
4. Optional for Cursor: **Settings → Instance-level MCP**, then the streamable HTTP URL  
   `https://evergladesfoundation.app.n8n.cloud/mcp-server/http`

---

## 2. Create the five credentials (before import)

**Credentials** in the left sidebar. Use the names in [`ACCOUNT.md`](ACCOUNT.md).

### Google Drive

n8n Cloud: **Sign in with Google** (Managed OAuth2). No Google Cloud project.

Then copy the Toolkit **folder** ID from  
`https://drive.google.com/drive/folders/<id>`  
into `GOOGLE_DRIVE_FOLDER_ID`. That value is a node parameter, not part of the OAuth credential.

### Postgres (Supabase)

Project Settings → Database → connection string.

- Host, database `postgres`, user `postgres`, database password
- Port **5432** (direct or **session** pooler)
- SSL **Require**
- Do **not** use transaction pooler port **6543**
- Do **not** use the `anon` or `service_role` API keys as the password

### Outlook and Excel

**Connect my account** on each Microsoft credential. Excel files must live in **OneDrive** for the Excel (OneDrive) node. After OAuth works, you can pick the workbook from the list instead of hunting for an ID.

### OpenAI

[Create a secret key](https://platform.openai.com/api-keys). Billing must be active.

---

## 3. Import (hard order)

Full click-path is in [`IMPORT.md`](IMPORT.md). Summary:

1. **⋯ → Import from File** → `WF2*.json` → assign credentials → **Save** → copy ID from the URL.
2. Import `WF1*.json` → assign credentials → Execute Sub-workflow **From list = WF2** → set Drive folder ID → **Save**.
3. Import `WF4*.json` → assign `EF Excel` → Workbook From list or `ONEDRIVE_WORKBOOK_ID` → **Save**.
4. **Execute WF1** once. Confirm `SELECT COUNT(*) FROM lessons;`
5. Import `WF3*.json` only after the catalog has rows.

Imported workflows stay **inactive** until a manual run succeeds. A schedule on WF1 before the first crawl will burn OpenAI quota on a broken link.

---

## 4. Placeholders the JSON will not fill

| Node | Replace with |
| --- | --- |
| Google Drive (folder) | `GOOGLE_DRIVE_FOLDER_ID` |
| Execute Sub-workflow | WF2 on **this** instance (list) |
| Microsoft Excel | Graph workbook ID or From list |
| Outlook | mailbox / recipient if the export has a stub address |

`node n8n/scripts/preflight.mjs` prints every credential type and any parameter that looks like a placeholder.

---

## 5. First crawl

1. WF1 editor → **Execute workflow** (not Activate).
2. **Executions**: WF1 and child WF2 runs should be green.
3. In Supabase SQL: `SELECT id, title, grade_min, grade_max FROM lessons LIMIT 20;`
4. Only then turn on a schedule / activate WF3.

---

## Widget alignment

The chat widget (`widget/src/types.ts`) expects each lesson to have:

`id`, `title`, `gradeRange`, `gradeMin`, `gradeMax`, `topics[]`, `ngsssStandards[]`, `fundamentalConcept`, `summary`, `lessonUrl`, `pdfUrl`

PreK is `-1`, Kindergarten is `0`. `grade_synonyms` maps phrases such as `pre-k` and `kindergarten` onto those integers so WF3 and `search_lessons` can filter the same way as the widget.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Sub-workflow not found | WF2 was not saved, or WF1 still has the export's old ID — pick WF2 From list |
| Postgres SSL / timeout | Port 5432 + SSL Require; not 6543 |
| Excel workbook empty list | File is in SharePoint, or the Excel OAuth user is not the OneDrive owner |
| Drive 404 | Folder ID is a file ID, or the OAuth user cannot see the folder |
| OpenAI 429 / insufficient_quota | Add billing; do not loop WF1 |
| Chatbot always empty | WF3 imported before WF1 ran |

Official references: [Export and import](https://docs.n8n.io/build/manage-workflows/export-and-import/), [Execute Sub-workflow](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow/), [Postgres credentials](https://docs.n8n.io/integrations/builtin/credentials/postgres/), [Google Managed OAuth2](https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/), [Microsoft Excel (OneDrive)](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.microsoftexcel/), [n8n API keys](https://docs.n8n.io/connect/n8n-api/authentication/).
