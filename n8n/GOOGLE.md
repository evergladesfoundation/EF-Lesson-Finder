# Google account — `info@evergladesliteracy.org`

**n8n already has Google credentials.** Do not create a second Google Drive OAuth credential.

The Google user on that credential should be **`info@evergladesliteracy.org`** (not a personal Gmail, not `yacosta@evergladesfoundation.org`).

Do not paste passwords or OAuth tokens into git.

Instance: [evergladesfoundation.app.n8n.cloud](https://evergladesfoundation.app.n8n.cloud)

---

## Lesson plans location

The Teacher Toolkit is in **Shared with me** for that account:

[https://drive.google.com/drive/shared-with-me](https://drive.google.com/drive/shared-with-me)

That URL is a Drive **view**, not a folder ID. Do not paste `shared-with-me` into a Folder ID field.

### n8n WF1 — search Shared with me

Google Drive node:

| Field | Value |
| --- | --- |
| Credential | existing Google Drive OAuth (`EF Google Drive`) |
| Resource | File/Folder |
| Operation | Search |
| Search Method | Advanced Search |
| Query String | `sharedWithMe = true and trashed = false` |
| Return All | on |

If Search returns nothing or 404s, use HTTP Request with the same credential:

```
GET https://www.googleapis.com/drive/v3/files
  q=sharedWithMe=true and trashed=false
  includeItemsFromAllDrives=true
  supportsAllDrives=true
  fields=nextPageToken,files(id,name,mimeType,parents,modifiedTime)
```

### Optional: one shared folder

If all plans live in a single folder, open it from Shared with me until the URL is `https://drive.google.com/drive/folders/<id>`. That `<id>` is `GOOGLE_DRIVE_FOLDER_ID`.

---

## Use the existing n8n credential

1. Open **Credentials** in n8n Cloud.
2. Open the Google Drive (OAuth2) credential that is already there.
3. Confirm it is connected. Rename it to `EF Google Drive` if needed.
4. Confirm the signed-in Google user is **`info@evergladesliteracy.org`**. If it is a different account, **Sign in with Google** on *this same credential* and switch — do not add a duplicate.
5. Leave authentication as **Managed OAuth2**.

A Drive 404 after import usually means the node used a My Drive folder ID, or the signed-in account cannot see the shared items.

---

## Cursor MCP (optional, for agents)

`.cursor/mcp.json` includes n8n (where Google already lives) and Google Drive MCP. Cloud Agents cannot complete browser OAuth. The crawl uses the n8n credential above.

---

## Check

| Check | Status |
| --- | --- |
| n8n Google Drive OAuth | **Already in n8n** — do not recreate |
| Signed-in Google user | `info@evergladesliteracy.org` |
| Credential name | `EF Google Drive` |
| Catalog | [Shared with me](https://drive.google.com/drive/shared-with-me) → `sharedWithMe = true` |
