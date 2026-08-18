# n8n — Everglades Lesson Finder

Instance: https://evergladesfoundation.app.n8n.cloud

Cloud Agents talk to this instance with the `N8N_API_KEY` runtime secret
(`X-N8N-API-KEY`). Cursor MCP (desktop) uses `.cursor/mcp.json`.

## Live workflows

| ID | Name | Role | State |
| --- | --- | --- | --- |
| `FDM2q7QnvtRCmgu4` | WF1 Reconciler | Crawl the Teacher Toolkit Drive folder tree, upsert `lessons` / `lesson_assets` | Inactive (click **Test workflow**) |
| `uht4O5B19PaCoC21` | WF2 Index Writer | After a crawl, refresh the OneDrive Master Index and email a digest | Inactive; called by WF1 |
| `zrwSv91m3lyK8zOA` | WF3 Widget Search | Public POST webhook the widget uses for structured search | **Active** |
| `3QmJRbonPXRwQgse` | WF4 Chat Agent | Multilingual chatbot (`find_lessons` / `get_lesson`) | Inactive; needs an OpenAI credential |

JSON exports of the live graphs live in `workflows/`. IDs and webhook URLs are in `ids.json`.

```
Google Drive (curriculum root)
        │
        ▼
   WF1 Reconciler  ──upsert──►  Supabase Postgres
        │                              │
        ▼                              ├── WF3 widget POST /webhook/lesson-finder-search
   WF2 Index Writer                    └── WF4 chat (after OpenAI credential)
        │
        ├── OneDrive Master Index
        └── Outlook digest
```

## Credentials already on the instance

These names are what the nodes actually bind to (not the `EF *` aliases from earlier checklists):

| n8n name | Type | Used by |
| --- | --- | --- |
| Google Drive account | Google Drive OAuth2 | WF1 |
| Postgres account | Postgres (Supabase port **5432**, SSL Require) | WF1, WF2, WF3, WF4 |
| Microsoft Excel OAuth2 API | Excel | WF2 |
| Microsoft Outlook OAuth2 API | Outlook | WF2 |

Missing for WF4: an **OpenAI** credential on the Chat Model node (`gpt-4.1-mini`).
The instance has Anthropic keys, not OpenAI.

## First crawl (WF1)

1. Open [WF1 Reconciler](https://evergladesfoundation.app.n8n.cloud/workflow/FDM2q7QnvtRCmgu4).
2. Confirm **Curriculum Root** is folder `1iT1_e65k_2yzXPpa-mMMt-yf-ajJpwCH` (Teacher Toolkit).
3. Confirm **Run Index Writer** points at WF2 (`uht4O5B19PaCoC21`). It continues if Excel is still missing a workbook ID.
4. Click **Test workflow**. Leave the nightly 2am trigger **inactive** until that run is green.
5. `SELECT count(*) FROM lessons WHERE status = 'Active';` should go above 0.
6. Then the widget stops using the bundled fallback catalog and serves n8n rows.

WF2 still has workbook placeholder `__SET_WORKBOOK_ID_IN_UI__`. Pick the Master Index from the Excel node **From list** before trusting the spreadsheet write.

## Widget search webhook

```
POST https://evergladesfoundation.app.n8n.cloud/webhook/lesson-finder-search
Content-Type: application/json

{"query":"5th-grade lesson on invasive species"}
```

Response shape matches `widget/src/types.ts` `ChatReply`, plus `catalogReady`.
When `catalogReady` is false (empty `lessons` table), the widget uses `widget/src/data/lessons.ts`.

Override the URL at build time with `VITE_N8N_SEARCH_URL`.
