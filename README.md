# runlog-auth

Tiny OAuth broker for the RunLog PWA. Holds the Whoop `CLIENT_SECRET` so the
PWA can stay in the browser without exposing credentials.

## Endpoints

All endpoints return JSON. CORS is enabled for `ALLOWED_ORIGIN` (env var).

### `GET /api/health`

Sanity check. Returns whether env vars are configured.

```
curl https://runlog-auth.vercel.app/api/health
```

### `POST /api/oauth-exchange`

Swap an OAuth authorization code for access/refresh tokens. Called by the PWA
after the user completes Whoop consent.

Body:
```json
{ "code": "...", "redirect_uri": "https://emimy.github.io/runlog-app/" }
```

Returns Whoop's token response as-is.

### `POST /api/refresh`

Refresh an expired access token.

Body:
```json
{ "refresh_token": "..." }
```

Returns Whoop's token response as-is.

## Deploy

```
# One-time
vercel login
vercel link

# Set secrets (or do it in the Vercel dashboard under Project Settings > Env Vars)
vercel env add WHOOP_CLIENT_ID
vercel env add WHOOP_CLIENT_SECRET
vercel env add ALLOWED_ORIGIN  # e.g. https://emimy.github.io

# Deploy
vercel --prod
```

After deploy, add the Vercel URL as a redirect URI in the Whoop Developer
Dashboard (for your OAuth app). Specifically, add the PWA's URL (not the
Vercel URL) because that's where Whoop redirects the user back to:

```
https://emimy.github.io/runlog-app/
```

## Security notes

- `CLIENT_SECRET` is only in Vercel env vars, never in git.
- The PWA only ever sees access/refresh tokens.
- Tokens are scoped to a single user (you). Lose the refresh token =
  inconvenience, not compromise (rotate the client secret to invalidate).
- CORS is locked to `ALLOWED_ORIGIN` — tighten this to your PWA's origin
  once you know it. Don't leave as `*` in production.
