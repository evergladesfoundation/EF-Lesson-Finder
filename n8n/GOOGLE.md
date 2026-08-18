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

**You do not need a folder ID.** WF1 crawls My Drive from **root** and every nested folder.

### n8n WF1 — list root, then recurse

1. Search: `'root' in parents and trashed = false`, Return All on, credential `EF Google Drive`.
2. Files → WF2. Folders → list children with `'FOLDER_ID' in parents and trashed = false`.
3. Repeat for nested folders.

If Search is empty, use HTTP Request with the same credential:

```
GET https://www.googleapis.com/drive/v3/files
  q='root' in parents and trashed=false
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

A Drive 404 or empty list usually means n8n OAuth is a different Google user than the `/u/2/` profile in Edge.

---

## Cursor MCP (optional, for agents)

`.cursor/mcp.json` includes n8n (where Google already lives) and Google Drive MCP. Cloud Agents cannot complete browser OAuth. The crawl uses the n8n credential above.

---

## Check

| Check | Status |
| --- | --- |
| n8n Google Drive OAuth | **Already in n8n** — do not recreate |
| Signed-in Google user | `info@evergladesliteracy.org` (same as Edge `/u/2/`) |
| Credential name | `EF Google Drive` |
| Catalog | [My Drive](https://drive.google.com/drive/u/2/my-drive) — all files and nested folders from `root` |
| Folder ID | **Not required** |
