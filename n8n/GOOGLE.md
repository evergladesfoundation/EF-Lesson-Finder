# Google account — `info@evergladesliteracy.org`

**n8n already has Google credentials.** Do not create a second Google Drive OAuth credential.

The Google user on that credential should be **`info@evergladesliteracy.org`** (not a personal Gmail, not `yacosta@evergladesfoundation.org`).

Do not paste passwords or OAuth tokens into git.

Instance: [evergladesfoundation.app.n8n.cloud](https://evergladesfoundation.app.n8n.cloud)

---

## Plan: every file and folder in My Drive

Catalog (browser): [https://drive.google.com/drive/u/2/my-drive](https://drive.google.com/drive/u/2/my-drive)

- `/u/2/` is the **third** Google account signed into Edge. Click the avatar and confirm it is `info@evergladesliteracy.org`.
- `/my-drive` is a **view**, not a folder ID. Do not paste `my-drive` into a Folder ID field.

**You do not need a folder ID.** WF1 searches all files the mailbox owns, including nested folders.

### n8n WF1 — Advanced Search (no Folder filter)

Drive Search with a Folder filter only returns **direct children** of that folder. To include nested files, leave Folder empty.

Imported JSON (`n8n/workflows/WF1-crawl-my-drive.json`) uses:

- Search method: **Advanced Search**
- Query: `trashed = false and 'me' in owners`
- What to Search: **Files**
- Credential: `EF Google Drive`
- Limit 25 until the first run is green, then **Return All**

If Search is empty, confirm the OAuth user is `info@evergladesliteracy.org`. Fallback HTTP Request with the same credential:

```
GET https://www.googleapis.com/drive/v3/files
  q=trashed=false and 'me' in owners
  fields=nextPageToken,files(id,name,mimeType,parents,modifiedTime,webViewLink)
```

---

## Use the existing n8n credential

1. Open **Credentials** in n8n Cloud.
2. Open the Google Drive (OAuth2) credential that is already there.
3. Confirm it is connected. Rename it to `EF Google Drive` if needed.
4. Confirm the signed-in Google user is **`info@evergladesliteracy.org`**. If it is a different account, **Sign in with Google** on *this same credential* and switch — do not add a duplicate.
5. Leave authentication as **Managed OAuth2**.

A Drive 404 or empty list usually means n8n OAuth is a different Google user than the `/u/2/` profile in Edge.

---

## Cursor MCP (optional, for agents)

`.cursor/mcp.json` includes n8n (where Google already lives) and Google Drive MCP. Cloud Agents cannot complete browser OAuth. The crawl uses the n8n credential above.

---

## Check

| Check | Status |
| --- | --- |
| n8n Google Drive OAuth | **Confirmed** — `info@evergladesliteracy.org`, name `EF Google Drive` |
| `EF Postgres` / `EF OpenAI` | **Confirmed** |
| Catalog | [My Drive](https://drive.google.com/drive/u/2/my-drive) — owned files, including nested folders |
| Folder ID | **Not required** |
| Next | Import `n8n/workflows/WF2-process-lesson.json`, then `WF1-crawl-my-drive.json`. Re-point Call WF2 From list. |
