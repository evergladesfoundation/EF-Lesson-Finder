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

### How to get the folder ID

`shared-with-me` has no ID. You only get an ID after you open a **folder**.

1. Sign in to Drive as **`info@evergladesliteracy.org`**.
2. Open [Shared with me](https://drive.google.com/drive/shared-with-me).
3. **Double-click the lesson-plans folder** (the folder icon, not a PDF or Doc).
4. Look at the address bar. It should look like:

   `https://drive.google.com/drive/folders/1AbCDefGhijKLmNopqRSTuv`

   The folder ID is the last segment: `1AbCDefGhijKLmNopqRSTuv`

5. If the URL is still `/drive/shared-with-me`, you have not opened a folder yet — go back and click into the folder.

**Other ways (same ID):**

- Right-click the folder → **Share** → **Copy link**. The link is `https://drive.google.com/drive/folders/<id>?usp=share_link` — use the part between `/folders/` and `?`.
- In n8n, Google Drive node → Folder → **From list** or **By URL** and paste that same link. n8n stores the ID; you do not have to type it.

Do not use a **file** URL (`/file/d/<id>/view`) — that is a file ID and WF1 will 404 if it expects a folder.

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
