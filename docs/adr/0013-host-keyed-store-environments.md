# 0013 — Host-keyed store environments (no env-var flipping)

## Status

Accepted (2026-07-03)

## Context

wcpos.com must take live money while beta.wcpos.com exercises the same code
against the staging Medusa with test-mode payment providers. The conventional
Vercel answer is two deployment tracks with different environment variables —
but every value that actually differs between the two (Stripe publishable
key, PayPal client id, Medusa publishable key, backend URL) is **public by
design**. Splitting deployments over public values buys nothing and costs a
second deploy pipeline, env drift, and a class of "wrong env on the wrong
domain" mistakes. It also conflicts with this project's standing rule:
config in code, git as the flip mechanism, env vars only for secrets and
test inputs.

## Decision

One build serves every domain. `src/lib/store-environment.ts` holds a
committed table of three environments and resolves per request from the
`Host` header:

- `wcpos.com` / `www.wcpos.com` → **live** (live keys, store-api.wcpos.com)
- `beta.wcpos.com`, `*.vercel.app` → **test** (test keys, store-api-staging)
- everything else (localhost, e2e) → **dev** (BTCPay-only, env-overridable
  backend for the mocked e2e harness)

Fail-safe direction: only the canonical production hostnames can resolve to
live — an unknown host can never reach live money.

Consequences of the request-scoped resolution:

- **'use cache' scopes can't read the host.** Cached fetches take the
  environment (name) as an argument, which also makes it part of the cache
  key — beta prices can never leak into a wcpos.com cache entry.
- **Prerendered marketing surfaces are host-agnostic** (one static shell for
  all domains), so the home price teaser and /pro JSON-LD pin to **live**
  explicitly.
- **Background work pins to live**: Discord role-sync and owner alerting
  reconcile live business data and have no meaningful request host.
- **Client components can't know the host at module scope** without
  hydration mismatches, so the checkout receives the resolved payment
  config as props from the server.

Secrets (Medusa admin token, download-token secret) remain ordinary env
vars — they are platform values that never differ per storefront domain and
never flip between deploys.

## Consequences

- Both domains alias the same deployment; promoting beta to production is a
  domain alias operation, never an env change or rebuild.
- Sessions are naturally isolated per domain (host-scoped cookies), so a
  staging login can't act on live data and vice versa.
- The staging Medusa must keep test-mode payment providers and a test-safe
  Keygen/webhook configuration — that guarantee lives in wcpos-medusa, not
  here.
- Transitional: the committed table currently falls back to env vars for the
  publishable keys (`TODO(launch)` markers). The end state is literal values
  in the table; the fallbacks exist only so current deploys keep working
  until the keys are pasted in.
