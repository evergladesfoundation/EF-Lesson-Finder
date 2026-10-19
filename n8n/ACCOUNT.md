# Account & credential inventory

Fill this **before** importing any workflow JSON. Tick a box only after you can log in and have created the matching n8n credential (or copied the value into `n8n/.env`).

Do **not** paste API keys, passwords, or tokens into this file if you will commit it. Put secrets in `n8n/.env` (gitignored) or in n8n Credentials.

Recommended n8n credential **names** — create these first, then pick them from each node's dropdown after import:

| n8n credential name | Type | Used by |
| --- | --- | --- |
| `EF Google Drive` | Google Drive OAuth2 | WF1 (and WF2 if it downloads files) |
| `EF Postgres` | Postgres | WF1, WF2, WF3 |
| `EF Outlook` | Microsoft Outlook OAuth2 | notification / mail nodes |
| `EF Excel` | Microsoft Excel OAuth2 (OneDrive) | WF4 |
| `EF OpenAI` | OpenAI API | embeddings / chat (WF2, WF3) |

---

## 1. n8n Cloud

- [ ] Account on [n8n Cloud](https://app.n8n.cloud) with access to [evergladesfoundation.app.n8n.cloud](https://evergladesfoundation.app.n8n.cloud)
- [ ] Plan is **not** the free trial if you need the public API (Settings → n8n API). **Import from File** works without the API.
- [ ] API key created: **Settings → n8n API → Create an API key**  
      Label: `EF Lesson Finder`  
      Copy once into `N8N_API_KEY` in `.env`
- [ ] (Optional, Cursor) Instance-level MCP enabled; token in `N8N_MCP_TOKEN`

Instance URL: `https://evergladesfoundation.app.n8n.cloud`

---

## 2. Google Drive

- [ ] Google account that can **read** the Teacher Toolkit lesson folder
- [ ] n8n credential `EF Google Drive`: **Sign in with Google** (Managed OAuth2 — no Google Cloud Console project needed on n8n Cloud)
- [ ] Folder ID copied from the folder URL into `GOOGLE_DRIVE_FOLDER_ID`

Folder URL: `https://drive.google.com/drive/folders/________________`

If Google shows **unverified app**, that is expected for Managed OAuth2. Continue with the same Google account that owns the folder.

---

## 3. Postgres / Supabase

Schema is already applied. `grade_synonyms` is populated. Do not re-run `schema.sql` against production unless you are standing up a new project.

- [ ] Supabase project (prefer **dev**, not production, for the first crawl)
- [ ] Database password known (Project Settings → Database)
- [ ] n8n credential `EF Postgres` filled from the **Direct** or **Session pooler** URI:

| Field | Value |
| --- | --- |
| Host | `db.<project-ref>.supabase.co` or session-pooler host |
| Database | `postgres` |
| User | `postgres` (or the pooler user `postgres.<project-ref>`) |
| Password | database password — **not** the `anon` / `service_role` API keys |
| Port | `5432` |
| SSL | **Require** |
| Ignore SSL Issues | off |

**Wrong:** Transaction pooler on port `6543`. n8n keeps a session; that pooler will error.

Smoke test after saving the credential: n8n should report the connection as working. Optionally run:

```sql
SELECT COUNT(*) FROM grade_synonyms;
```

---

## 4. Microsoft 365 (Outlook + Excel)

Use the Foundation work account that owns the OneDrive workbook and the mailbox that should send/receive mail.

- [ ] n8n credential `EF Outlook`: **Connect my account** (Microsoft Outlook OAuth2)
- [ ] n8n credential `EF Excel`: **Connect my account** (Microsoft Excel OAuth2). You can instead reuse a generic **Microsoft OAuth2 API** credential if you grant `Files.ReadWrite` (or `Files.ReadWrite.All`)
- [ ] Workbook exists in **OneDrive** (the Excel node does not read SharePoint libraries unless you use the SharePoint Excel node)
- [ ] Workbook ID copied into `ONEDRIVE_WORKBOOK_ID`

How to get the workbook ID (pick one):

1. **Preferred:** After `EF Excel` is connected, open the Excel node → **Workbook → From list** and select the file. n8n stores the Graph item ID.
2. **By ID:** Open the Excel node → **Workbook → By ID** and paste the Graph drive-item ID.
3. If the list is empty, confirm the file lives in **that user's OneDrive**, not a SharePoint document library.

Do not paste a SharePoint `sourcedoc={GUID}` from the browser address bar unless you have confirmed it is the Graph item ID the node expects.

Mailbox (if the Outlook node needs it): `________________`

Workbook name: `________________`  
Workbook ID: `________________`

---

## 5. OpenAI

- [ ] Project API key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- [ ] Billing enabled (embeddings and chat fail with a quota error otherwise)
- [ ] n8n credential `EF OpenAI`: paste the key. Leave Organization ID blank unless the key is in multiple orgs

---

## 6. After import — workflow IDs

Paste these from each workflow URL (`https://evergladesfoundation.app.n8n.cloud/workflow/<id>`) after you save. WF1's Execute Sub-workflow node must point at **WF2's** ID.

| Workflow | Saved name in n8n | ID |
| --- | --- | --- |
| WF2 (import first) | | |
| WF1 (link to WF2) | | |
| WF4 (Excel workbook ID) | | |
| WF3 (chatbot, after catalog is populated) | | |

---

## Ready-to-import gate

Stop here until every line is true:

- [ ] All five credentials exist in n8n (**Credentials** in the left sidebar) and each test/save succeeded
- [ ] `GOOGLE_DRIVE_FOLDER_ID` is in `.env`
- [ ] `ONEDRIVE_WORKBOOK_ID` is in `.env`
- [ ] Postgres uses port **5432** with SSL **Require**
- [ ] The four workflow JSON files are in `n8n/workflows/` (see that folder's README)
- [ ] You will import in this order only: **WF2 → WF1 (link) → WF4** — then run WF1 — then WF3
