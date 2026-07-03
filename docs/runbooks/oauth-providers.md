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
   registered in its console.** This is the step that breaks every time the
   site moves to a new hostname.

Because the callback is derived from the request origin, **every hostname the
site serves auth from must be registered in all three provider consoles.**

## Registered redirect URIs (keep this table true)

The URI pattern is `https://{host}/api/auth/{provider}/callback`.

| Host | Why |
|---|---|
| `www.wcpos.com` | Production. Apex `wcpos.com` 308s to www before the route runs, so only www is needed. |
| `beta.wcpos.com` | Beta alias (while it exists). |
| `localhost:3000` (`http://`) | Local dev. |

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
Vercel cron. For each provider it verifies the site hands the browser a
correct authorize URL with the exact canonical `redirect_uri`
(`https://www.wcpos.com/api/auth/{provider}/callback`), and for Google it also
fetches the authorize page and fails on `redirect_uri_mismatch`. Any failure
fires **authLogger.fatal → Discord + email** (see [alerting](./alerting.md)),
once per provider per hourly run, until fixed.

Manual run (any wcpos host):

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  'https://www.wcpos.com/api/health/oauth' | jq
# staging/beta drill:
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  'https://www.wcpos.com/api/health/oauth?base=https://beta.wcpos.com' | jq
```

Quick unauthenticated spot-check of what production actually sends:

```bash
for p in google github discord; do
  curl -sI "https://www.wcpos.com/api/auth/$p" | grep -i '^location'
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
