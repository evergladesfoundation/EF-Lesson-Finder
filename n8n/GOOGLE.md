# Google account — `info@evergladesliteracy.org`

**n8n already has Google credentials.** Do not create a second Google Drive OAuth credential.

The Google user on that credential should be **`info@evergladesliteracy.org`** (not a personal Gmail, not `yacosta@evergladesfoundation.org`).

Do not paste passwords or OAuth tokens into git.

Instance: [evergladesfoundation.app.n8n.cloud](https://evergladesfoundation.app.n8n.cloud)

---

## Plan: every file and folder in Shared with me

The Teacher Toolkit is everything that account can see under:

[https://drive.google.com/drive/shared-with-me](https://drive.google.com/drive/shared-with-me)

**You do not need a folder ID.** Do not paste `shared-with-me` into a Folder ID field.

If Shared with me is empty, the owner must **share** the parent folders (or a Shared drive) with `info@evergladesliteracy.org` as Viewer. Sharing the parent once is enough; do not share each file.

### n8n WF1 — list, then recurse

`sharedWithMe = true` returns only **top-level** shares. Nested files are missing until you walk folders.

1. Search: `sharedWithMe = true and trashed = false`, Return All on, credential `EF Google Drive`.
2. Files → WF2. Folders → list children with `'FOLDER_ID' in parents and trashed = false`.
3. Repeat for nested folders.

Always send `includeItemsFromAllDrives=true` and `supportsAllDrives=true`. If the Google Drive node cannot set those, use HTTP Request with the same credential:

```
GET https://www.googleapis.com/drive/v3/files
  q=sharedWithMe=true and trashed=false
  includeItemsFromAllDrives=true
  supportsAllDrives=true
  corpora=allDrives
  fields=nextPageToken,files(id,name,mimeType,parents,modifiedTime)
```

Children: same URL with `q='FOLDER_ID' in parents and trashed=false`.

---

## Use the existing n8n credential

1. Open **Credentials** in n8n Cloud.
2. Open the Google Drive (OAuth2) credential that is already there.
3. Confirm it is connected. Rename it to `EF Google Drive` if needed.
4. Confirm the signed-in Google user is **`info@evergladesliteracy.org`**. If it is a different account, **Sign in with Google** on *this same credential* and switch — do not add a duplicate.
5. Leave authentication as **Managed OAuth2**.

A Drive 404 or empty list usually means the node searched My Drive, skipped `supportsAllDrives`, or the owner has not shared the folders with this mailbox.

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
| Catalog | All Shared with me files **and** nested folders (recurse) |
| Folder ID | **Not required** |
