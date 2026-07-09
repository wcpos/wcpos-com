---
status: accepted
---

# A typed-error → response seam for coded API errors (narrow, not blanket)

## Context

Every route under `src/app/api/**` hand-rolls `try/catch -> NextResponse.json({ error }, { status })`. A survey of all 33 route files (~80 error returns) found the inconsistency is narrower than it looks:

- **Three JSON body shapes**, not fifteen. `{ error: string }` is the de-facto standard (~26 routes). The variation is overwhelmingly in the `(status, message)` pair — content, not structure.
- **A machine-readable `code` appears on exactly two routes**: `auth/register` (`ACCOUNT_EXISTS`, 409) and `store/cart/complete` (`order_pending`, 409). Only one is actually consumed by a client — `register-page-client.tsx` branches on `code === 'ACCOUNT_EXISTS'`. The cart `code` is documented contract/observability and is not branched on by `complete-cart.ts` (it keys off HTTP status).
- **`auth/register` classified the duplicate inline** by sniffing the provider string (`message.includes('already exists')`) — brittle knowledge sitting in the route.
- The only structurally divergent shape — `{ status, error }` on the two `electron/*` routes — is **not** a wart (see Non-goals).

The leverage here is **breadth** (many small call sites), not **depth** (a single tangled flow). A universal adapter over all ~80 returns would be a *shallow* module: deleting it leaves each call site as a one-line literal that reads just as well. It would also risk flattening the deliberate per-surface differences that docs/adr/0003 protected (auth gate redirect-vs-JSON), but for error responses.

## Decision

Introduce a **minimal, opt-in** seam and adopt it **only where a machine-readable `code` is emitted**:

- `ApiError(status, message, code?)` and `AccountExistsError` — pure typed errors in `src/lib/api/errors.ts` (no `next/server` import, throwable from any layer).
- `toErrorResponse(error)` in `src/lib/api/to-error-response.ts` — the single encoder of the wire contract; unknown errors map to a generic 500 that never leaks details.

Adopters:
- `auth/register` — `register()` now throws `AccountExistsError` at the **Medusa adapter seam** (where the provider response is parsed), mirroring CONTEXT.md's "normalize once at the adapter seam." The route delegates typed errors to `toErrorResponse` and keeps its existing 400-plus-message fallback for everything else.
- `store/cart/complete` — the `order_pending` branch returns `toErrorResponse(new ApiError(409, …, 'order_pending'))`. Byte-identical output, pinned by its existing test.

### Wire contract

`{ error: string, code?: string }`.

- `error` is for humans/logs; `code` is for machines and is present **only when a caller branches on it**. Most errors are display-only and carry no code — forcing one on every error would manufacture a meaningless enum for ~80 sites.
- **No `status` field in the body** (it is redundant with the HTTP status). The two routes that already emit a code keep byte-identical output.

## Non-goals (explicitly rejected)

- **Not a universal wrapper.** The ~26 `{ error }` one-liners (auth/validation) keep their explicit `NextResponse.json`. The seam is for the catch block when a typed domain error is in play, never a mandatory pass-through.
- **Not applied to `support/ask`.** Its `OpenclawError` mapping produces deliberately tuned, customer-safe copy ("try Discord while we get it back") and overrides the upstream status to 503. That copy belongs in the route, not a generic adapter; folding it in would either leak support-specific strings into the seam or regress the message. Left as-is.
- **The `electron/*` `{ status, error }` shape is NOT normalized.** The `status` field is part of a **versioned protocol consumed by already-shipped desktop auto-updater clients** (the routes version-gate `>= 1.4.0` vs legacy, and the success body carries `status` too — pinned by `electron/[platform]/[version]/route.test.ts`). Changing it is an outward-facing, hard-to-reverse contract change and is out of scope. An earlier draft proposed normalizing it; the route/test evidence reversed that.
- **No universal auth/customer gate** — docs/adr/0003 stands. The unauthenticated *response* still differs by surface (pages redirect, routes 401/404); this seam is only about error→response *encoding* and does not touch the redirect families (auth/oauth/discord callbacks).

## Consequences

- The `{ error, code }` contract has one home and one table-driven test (`to-error-response.test.ts`) instead of N routes re-asserting the shape.
- `register`'s brittle provider-string classification moved down to `register()`; the route is a clean delegate. The classification assertion moved with it (now a `medusa-auth.test.ts` case); the route test asserts delegation.
- Future routes that need a machine-readable code adopt `toErrorResponse`; the simple `{ error }` one-liners are deliberately left alone. `cart/complete` is the template for the next adopter.

## Amended 2026-07-09

The `toErrorResponse` adapter was never adopted as the route-layer seam and has
been removed. The current API wire contract is the translatable token shape
`{ errorCode }`, not the older `{ error, code? }` description above. A small
number of routes still append a route-local legacy `code` for shipped client
branches, but `errorCode` is the public token clients translate.

Typed errors are now classified at the Medusa adapter seam and carried by the
four narrow classes in `src/lib/api/errors.ts`: `ApiError`,
`AccountExistsError`, `InvalidCredentialsError`, and `InvalidResetTokenError`.
Each route that needs to expose one of those classifications currently defines
its own local `errorResponse` helper that returns `NextResponse.json({ errorCode }, { status })` (with any route-specific legacy extras kept local).

The Electron `{ status, error }` / `{ status, errorCode }` protocol remains a
shipped-client contract and is untouched by this amendment.
