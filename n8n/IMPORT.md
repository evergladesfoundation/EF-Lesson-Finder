# Import card — keep this open next to n8n

Do not skip steps. Do not activate a workflow until its row in this card is done.

Instance: [evergladesfoundation.app.n8n.cloud](https://evergladesfoundation.app.n8n.cloud)

---

## Before the editor

1. Finish every checkbox in [`ACCOUNT.md`](ACCOUNT.md).
2. Copy [`/.env.example`](.env.example) → `n8n/.env` and fill IDs (not required for OAuth — OAuth is created in the n8n UI).
3. Confirm JSON files exist:

```
n8n/workflows/WF2*.json    # sub-workflow — FIRST
n8n/workflows/WF1*.json    # Drive crawl / Postgres index
n8n/workflows/WF4*.json    # Excel / OneDrive
n8n/workflows/WF3*.json    # chatbot — LAST
```

4. Optional: `node n8n/scripts/preflight.mjs` — prints credential types and placeholder fields from those JSON files.

---

## Create credentials first (sidebar → Credentials)

Create these **names** exactly so the later dropdowns are obvious:

| Create this | How |
| --- | --- |
| `EF Google Drive` | Sign in with Google (Managed OAuth2) |
| `EF Postgres` | Host / db / user / password / port `5432` / SSL Require |
| `EF Outlook` | Connect my account |
| `EF Excel` | Connect my account |
| `EF OpenAI` | API key from platform.openai.com |

Imported JSON **does not** contain secrets. Every red/warning node after import means “pick a credential.”

---

## Import sequence

In the editor: **⋯ → Import from File**. Save after each import. Then copy the ID from the URL.

| Order | File | After import, do this, then Save |
| :---: | --- | --- |
| 1 | `WF2*.json` | Assign credentials on every node that has a credential dropdown. Leave inactive. Copy **WF2 ID**. |
| 2 | `WF1*.json` | Assign credentials. Open **Execute Sub-workflow** (or **Execute Workflow**). Source: **Database → From list → WF2**. Do not paste an ID from another n8n instance. Fill `GOOGLE_DRIVE_FOLDER_ID` on the Drive node if it is still a placeholder. Leave inactive. |
| 3 | `WF4*.json` | Assign `EF Excel` (and Outlook/Postgres if present). Set **Workbook** to the file (From list) or paste `ONEDRIVE_WORKBOOK_ID`. Leave inactive until you confirm the sheet name. |
| 4 | *Run WF1* | Editor → **Test workflow** / **Execute workflow**. Watch Executions. Confirm rows in Postgres `lessons`. |
| 5 | `WF3*.json` | Assign `EF OpenAI` + `EF Postgres`. Do not activate until a test chat returns a real lesson. |

### Linking WF1 → WF2

Imported Execute-Workflow nodes still point at the **old** instance's ID. They will fail until you re-select WF2 from the list on **this** instance.

1. Open WF2's URL, confirm it saved.
2. In WF1, open the sub-workflow node.
3. **Workflow** → **From list** → the WF2 you just imported.
4. Save WF1. The canvas label may look stale until you reopen the node — that is a known n8n quirk.

---

## Placeholder values to replace

Search each imported canvas (and the JSON, via preflight) for empty IDs, `YOUR_`, `CHANGE_ME`, `TODO`, or example.com.

| Where | Field | Paste from `.env` |
| --- | --- | --- |
| WF1 Google Drive node | Folder ID | `GOOGLE_DRIVE_FOLDER_ID` |
| WF1 Execute Sub-workflow | Workflow | WF2 from the list (not `.env`) |
| WF4 Microsoft Excel node | Workbook | `ONEDRIVE_WORKBOOK_ID` or From list |
| WF4 Excel node | Worksheet / table | `ONEDRIVE_WORKSHEET_NAME` |
| Outlook node (if present) | Mailbox / To | `OUTLOOK_MAILBOX` |
| Postgres nodes | Credential only | `EF Postgres` — do not paste the password into the node |

---

## First crawl (WF1)

- [ ] WF2 saved and selectable in WF1
- [ ] Drive + Postgres + OpenAI credentials assigned on WF1/WF2
- [ ] Folder ID is the Toolkit folder, not a file ID
- [ ] Execute **WF1** once (manual). Do not activate a schedule until the first run succeeds
- [ ] Executions view: WF1 green, WF2 child executions green
- [ ] `SELECT COUNT(*) FROM lessons;` is greater than 0

If WF1 is green but `lessons` is empty, WF2 failed or the upsert query does not match the live schema. Open the WF2 execution, not only WF1.

---

## Common mistakes

| If you… | What happens |
| --- | --- |
| Import WF1 before WF2 | Sub-workflow dropdown is empty; you cannot link them |
| Leave the old workflow ID in WF1 | WF1 errors: workflow not found |
| Use Supabase port **6543** | Intermittent Postgres errors |
| Paste `anon` / `service_role` as the DB password | Auth failed |
| Put the Excel file only in SharePoint | Excel (OneDrive) node cannot see it |
| Activate WF3 before the first crawl | Chatbot has nothing to search |
| Commit `.env` | Secrets in git — rotate every key |
