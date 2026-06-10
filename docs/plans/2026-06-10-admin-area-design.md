# Admin Area — Phase 1 & 2 Design

Date: 2026-06-10
Status: Implemented (phase 1: licenses/logs; phase 2: customers/orders, read-only)

## Context

An admin dashboard existed before the database was removed. The stub services
`src/services/core/users/users-service.ts` and
`src/services/core/logs/logs-service.ts` were left behind with a note that
they would be rebuilt against Medusa or external stores. This is that
rebuild: a read-only admin area at `/admin` for the site owner, backed by
the systems the site already integrates with (Keygen CE for licensing, Loki
for logs, GitHub for plugin releases, Medusa for customer auth).

Phase 1 is strictly READ-ONLY. No mutations of any kind — no license
revoke/suspend, no user-role writes. Those are phase 2 and require explicit
owner sign-off.

## Access control

**Decision: server-side email allowlist via the optional `ADMIN_EMAILS` env
var** (comma-separated, case-insensitive), checked against the Medusa
session's customer email.

- `src/lib/admin-auth.ts` exposes:
  - `requireAdmin()` — page guard. Uses `getCustomer()` from
    `src/lib/medusa-auth`; if there is no customer or the email is not in
    the allowlist, it calls `notFound()`. We deliberately render a 404
    rather than redirecting to login or returning 401/403 so the admin
    area's existence is never advertised.
  - `isAdmin()` — boolean check for API routes, which should respond with
    404 JSON for non-admins (matching the not-found pattern).
- Unset or empty `ADMIN_EMAILS` means **nobody** is admin (fail closed).
- Every admin page calls `requireAdmin()` itself, in addition to the layout
  guard — layouts alone are not a security boundary in Next.js, and the
  client is never trusted.

### Alternatives considered

1. **Medusa customer groups / metadata flag** (e.g. `metadata.role: 'admin'`
   on the customer). Rejected for phase 1: customer metadata is writable via
   the storefront update-profile path (`POST /store/customers/me`), so a
   customer could grant themselves admin. Would need server-side-only
   metadata or a Medusa admin API to be safe.
2. **Medusa admin users + admin JWT**. The real long-term answer for
   write-actions, but it requires `MEDUSA_ADMIN_API_KEY` provisioning and a
   second auth flow on wcpos-com. Deferred to phase 2.
3. **Basic auth / separate password in middleware**. Simple, but adds a
   second credential to manage and leaks the area's existence via the auth
   challenge. The allowlist reuses the existing Medusa session instead.

The env allowlist is the smallest safe mechanism: server-only, fail-closed,
no new credentials, easily replaced by a stronger mechanism later.

## Phase 1 scope (this PR)

- `ADMIN_EMAILS` added to the zod env schema (`src/utils/env.ts`).
- `src/lib/admin-auth.ts` — `requireAdmin()` / `isAdmin()` as above.
- Routes under `src/app/[locale]/admin/`:
  - `layout.tsx` — guard, nav sidebar, `robots: { index: false }` metadata.
  - `page.tsx` — dashboard: license totals + status breakdown
    (active/expired/suspended), total activated machines, latest 5 licenses,
    latest Pro plugin release (via `getProPluginReleases`).
  - `licenses/page.tsx` — paginated license browser (Keygen list endpoint),
    masked keys, status badges (account-page presentation rules: lowercase,
    active-past-expiry displays as expired), expiry, machines count, policy,
    created date; expandable rows showing activated machines.
  - `logs/page.tsx` — Loki logs viewer, last 1h, level filter via
    `?level=` search param.
  - `error.tsx` — consistent with `src/app/[locale]/account/error.tsx`.
- `/admin` was already in `src/app/robots.ts` disallow; added the
  locale-prefixed `/*/admin` variant.
- Admin UI is hardcoded English (internal tooling, matches site convention).
- All admin pages are server components; the only client component is the
  expandable licenses table.

### Data sources

| Data | Source | Notes |
|------|--------|-------|
| License list/stats | Keygen CE (`license.wcpos.com`) via new `listLicenses` / `listMachines` in `src/services/core/external/license-client.ts` | JSON:API pagination via `page[number]`/`page[size]`; `links.next` drives `hasNextPage`. CE list endpoints return no total counts, so dashboard stats page through results with a hard cap (10 × 100) and mark totals as truncated when the cap is hit. If the deployed CE rejects list endpoints at runtime, pages render an inline error state. |
| Machines per license | Keygen `GET /v1/licenses/{id}/machines` (existing `getLicenseMachines`) | Fetched in parallel per page of 20; a single failure renders "—" for that row. |
| Logs | Loki HTTP query API (`GET /loki/api/v1/query_range`) | Reuses the push path's `LOKI_URL`/`LOKI_API_KEY` env and `X-API-Key` header (see `src/lib/sinks/loki-sink.ts`, `src/app/api/logs/route.ts`). Selector `{service="wcpos-com"}` matches both server and browser push labels; level filter uses `| json | level = "..."`. If `LOKI_URL` is unset, the page shows a "not configured" state. If the key is push-only, the query fails and renders an inline error state. |
| Latest Pro release | GitHub via existing `getProPluginReleases` | First element (newest). |
| Admin identity | Medusa session (`getCustomer()`) | Same cookie/session as the account area. |

### Logs service interface changes (documented honestly)

The old stub's `ApiLog` (endpoint, platform, instance, appVersion,
errorMessage) described rows of the deleted Postgres table. Loki log lines
are the JSON written by `formatLokiEntry()` —
`{ level, category, message, properties? }` — plus stream labels. `ApiLog`
now mirrors that reality: `level`, `category`, `message`, `source`
(browser/server), `environment`, `properties`, `createdAt`. Offset
pagination (`PaginatedLogs`) was replaced by a time-range + limit model,
which is how Loki's `query_range` works. The service returns a
discriminated union (`unconfigured` / `error` / `ok`) so pages can render
resilient inline states instead of crashing.

## Phase 2 (implemented): customers & orders browsers

Still strictly READ-ONLY — no mutations of any kind.

### Data source & auth

`MEDUSA_ADMIN_API_KEY` (optional, zod env schema) holds a **Medusa v2
secret API key** (`sk_...`). The deployed backend is `@medusajs/medusa`
2.13.1; its authenticate middleware accepts secret keys on admin routes via
**HTTP Basic with the key as the username and an empty password**
(`Authorization: Basic base64("sk_...:")` — see `getApiKeyInfo` in
`@medusajs/framework`'s authenticate middleware). Provision one in the
Medusa admin (Settings → API Key Management → Secret Keys) and set it in
Vercel.

When the key is unset, the customers and orders pages render a
"Medusa admin access not configured" card (same fail-closed pattern as the
Loki logs viewer). Nothing else breaks.

### Client

`src/services/core/external/medusa-admin-client.ts` — server-only,
read-only: `listCustomers` (offset pagination + `q` search),
`getCustomerById`, `listOrders` (offset pagination, optional
`customer_id` filter), `getOrderById`. All functions return discriminated
unions (`unconfigured` / `error` / `not_found` / `ok`) and never throw.
Raw Medusa payloads are mapped onto minimal typed shapes before reaching
pages; upstream error bodies are never surfaced (HTTP status only).
Order list/detail requests use `fields=+email,+currency_code,+customer_id`
because Medusa's default admin order fields omit those; `payment_status`
is aggregated by Medusa's order workflows on every response.

### Pages

- `customers/page.tsx` — GET-form search (`?q=`), paginated table (email,
  name, registered/guest, created). Orders count per customer was skipped:
  it would cost one `/admin/orders` request per row.
- `customers/[customerId]/page.tsx` — profile fields, billing metadata
  summary, the customer's orders, and their licenses: references extracted
  via `extractLicenseReferencesFromOrders` (order metadata, where the
  backend's order-completed subscriber writes `metadata.licenses`) and
  resolved through the shared `resolveLicenseReferences` in
  `src/lib/customer-licenses.ts` (reused, not duplicated). Keys masked.
- `orders/page.tsx` — paginated table (display id, email, status via
  `getOrderDisplayStatus`, total via `formatOrderAmount`, date).
- `orders/[orderId]/page.tsx` — items, totals, link to the customer,
  license keys **masked** (`maskLicenseKey`; full keys never rendered).

Both sections are in the admin sidebar. Every page calls `requireAdmin()`;
upstream 404s render `notFound()` (the admin-area convention). No new API
routes — server components call the client directly, as in phase 1.

### users-service.ts removal

The dead `src/services/core/users/users-service.ts` stub (a relic of the
deleted Postgres database) was **deleted**, not rebuilt. Its `User` shape
(role/status columns) described the old DB table; the admin area's actual
need — browsing Medusa customers — is served by `medusa-admin-client.ts`.
Nothing imported the stub. Role management, if it ever lands, belongs to
the write-actions phase below.

## Phase 3 backlog (requires owner sign-off)

- **Write actions** (all gated behind explicit confirmation UI):
  - License revoke / suspend / reinstate (Keygen).
  - Machine deactivation on behalf of customers.
  - Customer management writes via the Medusa admin API.
- Logs: configurable time range, free-text search (LogQL line filter),
  category filter, pagination via Loki `start`/`end` cursors.
- Licenses: search by key/email, filter by status/policy, link a license to
  its Medusa customer/order.
- Orders: free-text search (`q`), status filter.
- Stronger admin auth (Medusa admin users) if/when more admins are added.

## Activation

Set `ADMIN_EMAILS` in Vercel (e.g. `paul@kilbot.com.au`) — without it,
every admin route 404s for everyone, including preview deploys.
Set `MEDUSA_ADMIN_API_KEY` (Medusa secret API key) to enable the customers
and orders browsers; they render a "not configured" card without it.
