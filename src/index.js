/**
 * Cloudflare Worker entry. The runtime treats every export on `main` as a
 * handler, so named helpers stay on `./worker.js` for `node:test` and this
 * file only re-exports the fetch handler.
 */
import app from "./worker.js";
export default app;
