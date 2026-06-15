# `services/` — external adapters

This tree holds **external adapters**: thin, `server-only` clients over
third-party APIs. Each adapter hides one external surface (HTTP shape, auth,
pagination, error mapping) behind a small interface.

```
src/services/core/
├── external/      # adapters over third-party APIs (all server-only)
│   ├── medusa-client.ts     # Medusa Store API (cart, orders, customers)
│   ├── license-client.ts    # Keygen licensing
│   ├── github-client.ts     # GitHub / Octokit (desktop releases)
│   ├── github-auth.ts        # GitHub App token minting
│   ├── github-roadmap.ts     # GitHub Projects (roadmap page)
│   └── keygen-base-url.ts    # Keygen host resolution
├── business/      # domain modules that compose adapters (migrating to lib/)
│   ├── pro-downloads.ts
│   └── electron-service.ts
└── analytics/     # PostHog server adapter
    └── posthog-service.ts    # feature flags + server capture (consent-gated)
```

## The real seam

The load-bearing distinction in this codebase is **external adapters vs domain
modules**, not `services` vs `lib`:

- **Adapters** (`services/core/external/*`) are thin clients over Medusa,
  Keygen, and GitHub. They are `server-only` and shallow by design.
- **Domain modules** (`lib/medusa-auth`, `lib/customer-licenses`,
  `lib/licenses`, `services/core/business/*`) compose adapters into WCPOS
  concepts. They live mostly in `lib/`; the modules under `business/` and
  `analytics/` are domain modules that historically landed here and may move to
  `lib/` opportunistically.

**Placement rule for new code:** a thin client over a third-party API →
`services/core/external/`. Anything that composes those into product behaviour,
plus pure utilities → `lib/`.

## `server-only`

Any module that reads secrets or makes a privileged network call imports
`server-only` so an accidental client import fails the build. This applies
regardless of which tree the module lives in.

## Data sources (there is no application database)

A local database was removed. There is **no app DB**. Persistent state lives in
the backends:

- **Commerce / customers / orders** → Medusa (`medusa-client`)
- **Licensing** → Keygen (`license-client`)
- **Product analytics & funnels** → PostHog (`posthog-service`, consent-gated)
- **Logs / error counts** → Loki + Sentry (see `src/lib/logger.ts`,
  `src/instrumentation.ts`)

Any future admin dashboard reads from PostHog (Query API) and Medusa — not from
a rebuilt local service.
