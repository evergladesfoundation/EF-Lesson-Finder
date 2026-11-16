# Workflow JSON

Drop the four n8n **Download** exports here. n8n Cloud: open a workflow → **⋯ → Download**.

Imported JSON includes credential *names/IDs from the source instance* but **not** secrets. After import you must pick `EF Google Drive`, `EF Postgres`, `EF Outlook`, `EF Excel`, and `EF OpenAI` on this instance.

## Required filenames

The preflight script and import card match these prefixes (anything after the prefix is fine):

| File | Import order | What it should contain |
| --- | :---: | --- |
| `WF2….json` | 1 | **Execute Sub-workflow Trigger** (When Executed by Another Workflow). Per-file extract / embed / Postgres upsert. |
| `WF1….json` | 2 | Drive folder crawl + **Execute Sub-workflow** node that must be re-pointed at WF2. |
| `WF4….json` | 3 | **Microsoft Excel (OneDrive)** node — set workbook ID after import. |
| `WF3….json` | 5 (after the first WF1 run) | Chat / agent against Postgres. |

Example names: `WF2-process-lesson.json`, `WF1-crawl-drive.json`, `WF4-excel-catalog.json`, `WF3-chatbot.json`.

## Do not

- Import all four at once and guess the links.
- Commit files that still contain live API keys in HTTP Request headers (n8n warns about this on export).
- Activate a schedule in the JSON (`active: true`) before credentials and the WF1→WF2 link are fixed. Save inactive, test, then activate in the UI.
