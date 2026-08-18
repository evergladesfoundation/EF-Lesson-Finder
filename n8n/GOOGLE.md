# Google account — `info@evergladesliteracy.org`

**n8n already has Google credentials.** Do not create a second Google Drive OAuth credential.

The Teacher Toolkit is crawled by n8n using that existing credential. The Google user on it should be **`info@evergladesliteracy.org`** (not a personal Gmail, not `yacosta@evergladesfoundation.org`).

Do not paste passwords or OAuth tokens into git.

Instance: [evergladesfoundation.app.n8n.cloud](https://evergladesfoundation.app.n8n.cloud)

---

## 1. Use the existing n8n credential

1. Open **Credentials** in n8n Cloud.
2. Open the Google Drive (OAuth2) credential that is already there.
3. Confirm it is connected. If it is not named `EF Google Drive`, rename it to that so WF1/WF2 can pick it from the dropdown after import.
4. Confirm the signed-in Google user is **`info@evergladesliteracy.org`**. If it is a different account, click **Sign in with Google** on *this same credential* and switch to that mailbox — do not add a duplicate credential.
5. Leave authentication as **Managed OAuth2**.

The Toolkit **folder ID** is a node parameter, not part of OAuth. Copy it from `https://drive.google.com/drive/folders/<id>` into `GOOGLE_DRIVE_FOLDER_ID`. A Drive 404 after import usually means the ID is a file ID, or that Google user cannot see the folder.

---

## 2. Cursor MCP (optional, for agents)

`.cursor/mcp.json` includes:

- **n8n** — talk to the instance that already holds Google credentials (`https://evergladesfoundation.app.n8n.cloud/mcp-server/http`). Complete n8n OAuth in Cursor Desktop when prompted.
- **google-drive** — Google’s remote Drive MCP, only if a Cloud Agent needs to read Drive *outside* n8n. Authenticate as `info@evergladesliteracy.org`.

Cloud Agents cannot complete those browser OAuth windows. The Lesson Finder crawl uses the n8n credential in section 1; that path does not need Cursor Google OAuth.

---

## Check

| Check | Status |
| --- | --- |
| n8n Google Drive OAuth credential exists | **Already in n8n** — do not recreate |
| Signed-in Google user | `info@evergladesliteracy.org` |
| Credential name | `EF Google Drive` (rename the existing one if needed) |
| Toolkit folder ID | Last segment of the Drive folder URL → `GOOGLE_DRIVE_FOLDER_ID` |
