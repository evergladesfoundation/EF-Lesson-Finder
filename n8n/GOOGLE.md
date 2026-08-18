# Google account — `info@evergladesliteracy.org`

The Teacher Toolkit lives in Google Drive. Every Google sign-in for this project (n8n **and** Cursor) must use **`info@evergladesliteracy.org`**, not a personal Gmail and not `yacosta@evergladesfoundation.org`.

Do not paste passwords or OAuth tokens into git. OAuth happens in the browser.

---

## 1. n8n Cloud — `EF Google Drive`

This is the credential WF1 uses to crawl the Toolkit folder.

1. Open [evergladesfoundation.app.n8n.cloud](https://evergladesfoundation.app.n8n.cloud) and go to **Credentials**.
2. **Add credential** → **Google Drive OAuth2**.
3. Name it exactly `EF Google Drive`.
4. Leave authentication as **Managed OAuth2** (n8n Cloud). No Google Cloud Console project is required.
5. Click **Sign in with Google**.
6. Choose **`info@evergladesliteracy.org`**. If Google shows an unverified-app warning, continue with that same account.
7. **Save**.

Then copy the Toolkit **folder** ID (last segment of `https://drive.google.com/drive/folders/<id>`) into `GOOGLE_DRIVE_FOLDER_ID`. That value is a node parameter, not part of the OAuth credential. A Drive 404 after import usually means the folder ID is a file ID, or the signed-in account cannot see the folder.

Official reference: [Google Managed OAuth2](https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/).

---

## 2. Cursor — Google Drive MCP

`.cursor/mcp.json` points at Google's remote Drive MCP (`https://drivemcp.googleapis.com/mcp/v1`). After this file is in the workspace:

1. In Cursor Desktop, open **Customize → MCP** (or install the [Google Drive plugin](https://cursor.com/marketplace/cursor/google-drive)).
2. When the Google sign-in window opens, switch account and authenticate as **`info@evergladesliteracy.org`**.
3. Reload MCP if the server is listed but still unauthorized.

Cloud Agents cannot complete that browser OAuth. Desktop Cursor can; a new Cloud Agent after you authenticate may pick up the same team/user connection depending on dashboard MCP settings.

---

## Check

| Check | Expected |
| --- | --- |
| n8n credential `EF Google Drive` | Connected, signed in as `info@evergladesliteracy.org` |
| Cursor Google Drive MCP | Authenticated as `info@evergladesliteracy.org` |
| Toolkit folder | Visible in Drive for that account; ID in `GOOGLE_DRIVE_FOLDER_ID` |
