// api/health.js
// Simple sanity check — returns 200 if the function runs.
// Tells you CLIENT_ID is configured (but never returns its value).

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  return res.status(200).json({
    ok: true,
    has_client_id: !!process.env.WHOOP_CLIENT_ID,
    has_client_secret: !!process.env.WHOOP_CLIENT_SECRET,
    allowed_origin: ALLOWED_ORIGIN,
    runtime: "vercel-node",
    now: new Date().toISOString(),
  });
}
