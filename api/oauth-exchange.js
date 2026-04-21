// api/oauth-exchange.js
// Exchanges an OAuth authorization code for access/refresh tokens.
// Called by the RunLog PWA after the user completes Whoop consent.
//
// Keeps the CLIENT_SECRET on Vercel — never sent to the browser.

const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";

// CORS — allow the PWA origin. Tighten this to your actual PWA URL once known.
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
  // Preflight
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

  // Body can arrive as already-parsed JSON (Vercel default) or raw string
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { code, redirect_uri } = body || {};

  if (!code || !redirect_uri) {
    Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(400).json({ error: "missing_params", need: ["code", "redirect_uri"] });
  }

  try {
    const whoopRes = await fetch(WHOOP_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const text = await whoopRes.text();
    let tokenJson;
    try { tokenJson = JSON.parse(text); } catch { tokenJson = { raw: text }; }

    Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));

    if (!whoopRes.ok) {
      return res.status(whoopRes.status).json({
        error: "whoop_token_exchange_failed",
        whoop_status: whoopRes.status,
        whoop_body: tokenJson,
      });
    }

    // Return the tokens as-is so the PWA can store them
    return res.status(200).json(tokenJson);
  } catch (err) {
    Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(500).json({ error: "internal_error", message: err.message });
  }
}
