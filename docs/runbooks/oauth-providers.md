# Runbook: OAuth sign-in providers

Google / GitHub / Discord sign-in on wcpos.com. What has to be registered
where, why it breaks when a hostname changes, and how to verify it end to end.

## How the flow works

1. Browser hits `GET /api/auth/{provider}` ([route](../../src/app/api/auth/%5Bprovider%5D/route.ts)).
2. The route builds `callback_url = {request origin}/api/auth/{provider}/callback`
   and asks Medusa (`POST /auth/customer/{provider}`) for the provider's
   authorize URL.
3. Medusa returns the provider authorize URL containing that `redirect_uri`;
   the browser is redirected there.
4. **The provider only proceeds if `redirect_uri` exactly matches a URI
   registered in its console — byte-for-byte, query string included.** This
   is the step that breaks every time the site moves to a new hostname.

Because the callback is derived from the request origin, **every hostname the
site serves auth from must be registered in all three provider consoles.**

**Trap: never put query params on the callback URL.** Exact matching includes
the query string, so `…/callback?redirect=/pro` fails with
`redirect_uri_mismatch` even when `…/callback` is registered (verified live
against Google 2026-07-03 — this silently broke every deep-link sign-in, e.g.
from checkout, for as long as the param existed). The post-sign-in
destination travels in the short-lived `oauth_redirect` httpOnly cookie
(`OAUTH_REDIRECT_COOKIE` in [oauth-providers.ts](../../src/lib/oauth-providers.ts)),
set at initiate time and consumed by the callback.

## Registered redirect URIs (keep this table true)

The URI pattern is `https://{host}/api/auth/{provider}/callback`.

| Host | Why |
|---|---|
| `wcpos.com` | **Preferred canonical (apex).** Register it even while Vercel still redirects apex → www, so flipping the primary domain can't break sign-in. |
| `www.wcpos.com` | Currently the serving host — Vercel's primary-domain setting 308s apex → www before the auth route runs. |
| `beta.wcpos.com` | Beta alias (while it exists). |
| `localhost:3000` (`http://`) | Local dev. |

**Owner preference: apex `wcpos.com` is the canonical host.** The apex ⇄ www
direction is Vercel's primary-domain setting (Vercel → project → Settings →
Domains), not anything in this repo. To make apex canonical: register the apex
URIs in all three consoles first (table above), then set `wcpos.com` as the
primary domain with `www.wcpos.com` redirecting to it. The health check
follows the redirect either way and validates whichever host actually serves
the route.

## Where to register (one console per provider)

| Provider | Console | Client ID |
|---|---|---|
| Google | [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials) → the OAuth 2.0 client → **Authorized redirect URIs** | `577345945742-l02rumj0n24ff74fjo8jhsou1roa797k.apps.googleusercontent.com` |
| GitHub | [GitHub → Settings → Developer settings → GitHub Apps](https://github.com/settings/apps) → the app → **Callback URL** (GitHub Apps allow multiple) | `Iv23liDNRwQvhHZziaix` |
| Discord | [Discord Developer Portal](https://discord.com/developers/applications) → the app → **OAuth2 → Redirects** | `1516454711178563584` |

Google changes can take a few minutes to propagate after saving.

## What breakage looks like

| Provider | Symptom when the redirect URI is not registered | Detectable without logging in? |
|---|---|---|
| Google | Error page **before** login: "Access blocked … Error 400: redirect_uri_mismatch" | **Yes** — the error is in the authorize page body |
| GitHub | Normal login page first; error only **after** the user authenticates | No |
| Discord | Normal login page first; error only **after** the user authenticates | No |

This asymmetry matters: Google failures are caught automatically (below);
GitHub/Discord console drift can only be caught by an authenticated login test.

## Automated monitoring

`GET /api/health/oauth` (cron-guarded, `CRON_SECRET`) runs **hourly** via
Vercel cron. It starts from apex `https://wcpos.com`, follows any same-site
redirect (apex ⇄ www) to the actual serving host, verifies each provider is
handed a correct authorize URL whose `redirect_uri` exactly matches
`{serving origin}/api/auth/{provider}/callback`, and for Google also fetches
the authorize page and fails on the `redirect_uri_mismatch` error code.
Confirmed breakage fires **one aggregated authLogger.fatal → Discord + email**
(see [alerting](./alerting.md)) listing every broken provider, every hourly
run until fixed. Transient blips are absorbed: probe fetches time out at 10s,
and the initiate step retries once after 5s (a routine Medusa redeploy won't
page). A Google error page *without* the mismatch code (rate limiting / bot
defense against datacenter IPs) is reported as **`inconclusive`** — logged at
error level, no fatal, `HTTP 200` with `"inconclusive": true`. Occasional
inconclusive runs are noise; *every* run inconclusive means Google is blocking
Vercel's egress IPs and the Google leg of the check is blind — verify sign-in
manually. The JSON response includes `servingOrigin` per provider, so it also
shows which host is currently canonical in Vercel.

**Deploy acceptance (run once after the cron first ships, or when `CRON_SECRET`
changes):** the guard fails closed, so a missing/empty `CRON_SECRET` means the
cron 401s forever with zero signal (see incident #207 for the empty-string env
failure mode). Also confirm the Vercel plan allows hourly crons (Hobby caps
crons at once per day — this is the project's first sub-daily schedule).
Run the manual curl below against the **deployed** endpoint and expect JSON
(not 401); check `results` — this also proves Google tolerates probe traffic
from Vercel's egress IPs (datacenter reputation differs from a residential
curl).

Manual run:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  'https://wcpos.com/api/health/oauth' | jq
# staging/beta drill:
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  'https://wcpos.com/api/health/oauth?base=https://beta.wcpos.com' | jq
```

Quick unauthenticated spot-check of what production actually sends
(`-L` follows the apex→www hop while it exists):

```bash
for p in google github discord; do
  curl -sIL "https://wcpos.com/api/auth/$p" | grep -i '^location' | tail -1
done
```

## Full verification (after any console or hostname change)

1. `curl` the health endpoint above — all three `"status": "ok"`.
2. Log in with **each** provider in a real browser on the production host
   (this is the only way to verify GitHub/Discord console registration).
3. Confirm you land on `/account` signed in.

## Checklist: adding or renaming a hostname

1. Add `https://{new-host}/api/auth/{provider}/callback` in **all three**
   consoles (table above).
2. Update the registered-URIs table in this file.
3. Run the full verification against the new host.
4. Only then point traffic/DNS at it.
