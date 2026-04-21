// api/refresh.js
// Refreshes an expired Whoop access token using the refresh token.
// The client secret stays on Vercel; the PWA only ever sees tokens.

const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(500).json({ error: "server_not_configured" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { refresh_token } = body || {};

  if (!refresh_token) {
    Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(400).json({ error: "missing_refresh_token" });
  }

  try {
    const whoopRes = await fetch(WHOOP_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
        scope: "offline",
      }),
    });

    const text = await whoopRes.text();
    let tokenJson;
    try { tokenJson = JSON.parse(text); } catch { tokenJson = { raw: text }; }

    Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));

    if (!whoopRes.ok) {
      return res.status(whoopRes.status).json({
        error: "whoop_refresh_failed",
        whoop_status: whoopRes.status,
        whoop_body: tokenJson,
      });
    }

    return res.status(200).json(tokenJson);
  } catch (err) {
    Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(500).json({ error: "internal_error", message: err.message });
  }
}
