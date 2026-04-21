// api/whoop-proxy.js
// Thin passthrough so the browser PWA can reach Whoop API despite CORS.
// Whoop's developer API does not set Access-Control-Allow-Origin, so direct
// browser calls fail. This function takes the access token as a Bearer header
// from the client, forwards the request to Whoop, and returns the response
// with CORS headers attached.
//
// Security note: the access token is the only thing sent. The client secret
// stays in the /api/oauth-exchange and /api/refresh functions.

const WHOOP_BASE = "https://api.prod.whoop.com/developer/v2";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export default async function handler(req, res) {
  const setCors = () => Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === "OPTIONS") {
    setCors();
    return res.status(204).end();
  }

  // Only accept GET for safety — we're exposing a generic passthrough and
  // want to scope it to read operations.
  if (req.method !== "GET") {
    setCors();
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const auth = req.headers["authorization"] || req.headers["Authorization"];
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
    setCors();
    return res.status(401).json({ error: "missing_bearer" });
  }

  // Extract the Whoop API path from query string: ?path=/user/profile/basic
  const path = req.query.path;
  if (!path || typeof path !== "string" || !path.startsWith("/")) {
    setCors();
    return res.status(400).json({ error: "bad_path", need: "?path=/endpoint" });
  }

  // Build the Whoop URL, preserving all other query params (start, end, limit, etc.)
  const upstream = new URL(WHOOP_BASE + path);
  for (const [k, v] of Object.entries(req.query)) {
    if (k === "path") continue;
    if (Array.isArray(v)) v.forEach(x => upstream.searchParams.append(k, x));
    else upstream.searchParams.set(k, v);
  }

  try {
    const whoopRes = await fetch(upstream.toString(), {
      headers: { Authorization: auth },
    });
    const text = await whoopRes.text();
    setCors();
    res.setHeader("Content-Type", whoopRes.headers.get("content-type") || "application/json");
    return res.status(whoopRes.status).send(text);
  } catch (err) {
    setCors();
    return res.status(502).json({ error: "upstream_failed", message: err.message });
  }
}
