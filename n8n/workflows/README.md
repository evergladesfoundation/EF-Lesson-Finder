# Workflow JSON

These files recreate WF2 then WF1 for [evergladesfoundation.app.n8n.cloud](https://evergladesfoundation.app.n8n.cloud). They are **inactive** (`"active": false`).

This agent cannot create them on the n8n canvas (API returns 401 without `X-N8N-API-KEY`). Import the files below.

## Import order

1. **⋯ → Import from File** → `WF2-process-lesson.json`
2. Assign **EF Google Drive**, **EF OpenAI**, **EF Postgres** if the dropdowns are empty. **Save**. Copy the ID from the URL (`/workflow/<id>`).
3. Import `WF1-crawl-my-drive.json`
4. Assign **EF Google Drive**. Open **Call WF2** → Workflow **From list** → the WF2 you just saved (do not leave `REPLACE_WITH_WF2_ID`). **Save**. Stay inactive.
5. **Test workflow** on WF1 (Limit 25). Then `SELECT COUNT(*) FROM lessons;`
6. On List My Drive files, turn on **Return All** only after that test is green.

Do not import WF3/WF4 from this folder — they are not in this export.

## What they do

| File | Role |
| --- | --- |
| `WF2-process-lesson.json` | Download one Drive file (Docs → PDF), extract text, OpenAI metadata JSON, upsert `lessons` |
| `WF1-crawl-my-drive.json` | Search files owned by the Google user (nested My Drive, no folder ID), keep PDFs/Docs, loop one file at a time into WF2 |

Schema: [`../schema.sql`](../schema.sql). Google user: `info@evergladesliteracy.org`.
