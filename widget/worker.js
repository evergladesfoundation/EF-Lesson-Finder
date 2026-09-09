export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // Assets such as /widget.js are served by Wrangler before this Worker.
    // Do not fetch the incoming request URL here: that re-enters the Worker
    // and Cloudflare returns error 1042 on every path, including widget.js.
    const asset = await env.ASSETS.fetch(request);
    const headers = new Headers(asset.headers);
    for (const [key, value] of Object.entries(corsHeaders())) {
      headers.set(key, value);
    }
    headers.delete("X-Frame-Options");
    return new Response(asset.body, {
      status: asset.status,
      statusText: asset.statusText,
      headers,
    });
  },
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Content-Security-Policy": "frame-ancestors *",
  };
}
