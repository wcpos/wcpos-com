---
status: rejected
---

# Rejected: requireCustomer() DAL helper and server-side env consolidation

Two refactor candidates from the 2026-06-10 architecture review were
confirmed by one adversarial verification round, rejected by a second,
and finally rejected by the owner. Recorded so they stop being
re-proposed in reviews.

**requireCustomer() DAL helper** — the unauthenticated paths are
deliberately different per surface: account pages redirect through the
cookie-clearing logout handler (bounce-loop fix), checkout has its own
prerequisite flow, and API routes return 401/404 JSON. A shared helper
would flatten real behavioral differences behind one name and obscure
the redirect path that the invalid-token fix depends on.

**Server-side env consolidation** — Next.js only inlines literal
`process.env.NEXT_PUBLIC_*` references, so a consolidated env object can
never safely cross the client boundary; what remains is a server-only
shuffle that buys little over the existing zod-validated
`src/utils/env.ts`. Not worth the churn.
