# Checkout Abuse Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop automated account/card testing, place the three paid incident accounts on a reversible security hold, and restore owner “View as” without changing Stripe charges or deleting evidence.

**Architecture:** `wcpos-com` adds host-resolved Turnstile to both registration surfaces, distinguishes rate-limit infrastructure failure from quota exhaustion, and protects payment-session allocation with IP and customer buckets. A shared security-hold predicate is enforced before session cookies are written and for existing account sessions; `wcpos-medusa` adds the authoritative store-API hold middleware and an exact-ID remediation script. The case-sensitive Medusa Admin email lookup is repaired with `q` plus an application-side exact match.

**Tech Stack:** Next.js 16 route handlers, React 19, Vitest, Cloudflare Turnstile, Upstash Redis, Medusa v2, Keygen CE, Vercel.

## Global Constraints

- Do not refund, dispute, cancel, or otherwise modify the three Stripe charges.
- Do not delete the 209 incident customers, their auth identities, carts, orders, payment records, or emails.
- Do not select accounts for security hold by email pattern; only the three audited customer IDs may be changed.
- Keep the three Keygen licences suspended; they currently have zero machines.
- Registration and payment-session allocation fail closed when Upstash is missing, times out, or errors.
- Login and ordinary existing-account reads must not become dependent on Upstash availability.
- Owner impersonation remains allowlist-only and read-only, including for held customers.
- Never log passwords, Turnstile tokens, Redis credentials, card data, licence keys, or complete customer emails.
- Use test-driven development: every behavior-changing production edit follows a focused failing test.
- Apply production account holds only after both repositories are deployed and verified.

## File map

### `wcpos-com`

- `src/lib/rate-limit.ts`: classify allowed, limited, and unavailable limiter results while preserving legacy callers.
- `src/app/api/auth/register/route.ts`: fail-closed limiter and Turnstile enforcement.
- `src/app/api/store/cart/payment-sessions/route.ts`: IP/customer allocation limits.
- `src/app/[locale]/(auth)/register/register-page-client.tsx`: standalone registration challenge.
- `src/components/pro/checkout/account-step.tsx`: inline checkout registration challenge.
- `src/lib/customer-security-hold.ts`: pure metadata predicate.
- `src/lib/medusa-auth.ts`, `src/lib/oauth.ts`, auth routes: candidate-token and existing-session hold enforcement.
- `src/lib/discord/medusa-admin.ts`: case-insensitive exact “View as” lookup.
- `src/app/[locale]/account/admin/page.tsx`: visible lookup errors.
- `messages/*.json`: localized bot, infrastructure, hold, and admin lookup errors.
- `src/utils/env.ts`, `.env.example`: production configuration contract.

### `wcpos-medusa`

- `src/lib/customer-security-hold.ts`: backend metadata predicate and middleware.
- `src/api/middlewares.ts`: optional customer authentication followed by authoritative hold denial on sensitive store routes.
- `src/scripts/security-hold-customers.ts`: exact-ID dry-run/apply/release tool.

---

### Task 1: Classify rate-limit health without changing legacy behavior

**Files:**
- Modify: `src/lib/rate-limit.ts`
- Modify: `src/lib/rate-limit.test.ts`
- Create: `src/lib/request-host.ts`
- Create: `src/lib/request-host.test.ts`
- Modify: `src/lib/support/turnstile.ts`
- Modify: `src/utils/env.ts`
- Modify: `src/utils/env.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `RateLimitStatus = 'allowed' | 'limited' | 'unavailable'`.
- Produces: `RateLimitResult { success: boolean; remaining: number; status: RateLimitStatus }`.
- Preserves: unprotected callers may continue reading only `success`; unavailable remains `success: true` for those callers.
- Produces: `isLoopbackHost(host)` shared by Turnstile and protected-route local/E2E behavior; it accepts only `localhost`, `127.0.0.1`, and `[::1]` with optional ports.

- [ ] **Step 1: Add failing limiter classification tests**

Use isolated module imports/mocked `@upstash/redis` and `@upstash/ratelimit` to assert these exact results:

```ts
expect(await unconfigured.consume('k')).toEqual({
  success: true,
  remaining: Infinity,
  status: 'unavailable',
})
expect(await allowed.consume('k')).toMatchObject({ success: true, status: 'allowed' })
expect(await limited.consume('k')).toMatchObject({ success: false, status: 'limited' })
expect(await timedOut.consume('k')).toMatchObject({ success: true, status: 'unavailable' })
expect(await throws.consume('k')).toMatchObject({ success: true, status: 'unavailable' })
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm test:unit src/lib/rate-limit.test.ts`

Expected: FAIL because `status` does not exist and timeout responses are treated as allowed.

- [ ] **Step 3: Implement the minimal classification**

Map SDK results as follows:

```ts
if (!limiter) return { success: true, remaining: Infinity, status: 'unavailable' }
try {
  const result = await limiter.limit(key)
  if (result.reason === 'timeout') {
    return { success: true, remaining: result.remaining, status: 'unavailable' }
  }
  return {
    success: result.success,
    remaining: result.remaining,
    status: result.success ? 'allowed' : 'limited',
  }
} catch {
  return { success: true, remaining: Infinity, status: 'unavailable' }
}
```

Add `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and
`TURNSTILE_SECRET_KEY` to `REQUIRED_ON_PRODUCTION`. Update the env tests so a
Vercel production build fails when any is absent and succeeds when all are set.
Document all three variables and the protected-route fail-closed behavior in
`.env.example`; remove any statement that claims every limiter always fails open.

Extract the existing strict loopback parser from `support/turnstile.ts` into
`request-host.ts` and lock it with tests. Unknown hosts, empty hosts, and
`*.vercel.app` must return false. Protected routes may admit an unavailable
limiter only when this exact helper returns true, keeping local development and
the production-mode Playwright server deterministic without introducing a
`NODE_ENV` production bypass.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
pnpm test:unit src/lib/rate-limit.test.ts src/lib/request-host.test.ts \
  src/lib/support/turnstile.test.ts src/utils/env.test.ts
pnpm type-check
```

Expected: all focused tests pass and TypeScript reports no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rate-limit.ts src/lib/rate-limit.test.ts \
  src/lib/request-host.ts src/lib/request-host.test.ts src/lib/support/turnstile.ts \
  src/utils/env.ts src/utils/env.test.ts .env.example
git commit -m "fix(security): expose rate-limit infrastructure failures"
```

---

### Task 2: Require Turnstile on both registration surfaces

**Files:**
- Modify: `src/app/api/auth/register/route.ts`
- Modify: `src/app/api/auth/register/route.test.ts`
- Modify: `src/app/[locale]/(auth)/register/register-page-client.tsx`
- Modify: `src/app/[locale]/(auth)/register/register-page-client.test.tsx`
- Modify: `src/components/pro/checkout/account-step.tsx`
- Create: `src/components/pro/checkout/account-step.test.tsx`
- Modify: `messages/en.json`, `messages/de.json`, `messages/es.json`, `messages/fr.json`, `messages/it.json`, `messages/ja.json`, `messages/ko.json`, `messages/nl.json`, `messages/pl.json`, `messages/pt.json`, `messages/zh.json`

**Interfaces:**
- Consumes: `RateLimitResult.status` from Task 1.
- Consumes: `verifyTurnstile(token, host, ip)` and `resolveTurnstileSiteKey(host)`.
- Produces: registration body field `turnstileToken: string`.
- Produces: route error codes `bot_check_failed` (403) and `rate_limit_unavailable` (503).

- [ ] **Step 1: Add failing registration route tests**

Mock `verifyTurnstile` and use a default limiter result of
`{ success: true, remaining: 4, status: 'allowed' }`. Add cases proving:

```ts
expect(unavailableResponse.status).toBe(503)
expect(await unavailableResponse.json()).toEqual({ errorCode: 'rate_limit_unavailable' })
expect(verifyTurnstile).not.toHaveBeenCalled()
expect(mockRegister).not.toHaveBeenCalled()

expect(invalidChallengeResponse.status).toBe(403)
expect(await invalidChallengeResponse.json()).toEqual({ errorCode: 'bot_check_failed' })
expect(verifyTurnstile).toHaveBeenCalledWith('bad-token', 'wcpos.com', '203.0.113.7')
expect(mockRegister).not.toHaveBeenCalled()
```

The success test must supply `turnstileToken: 'valid-token'` and prove Medusa is
called only after `verifyTurnstile` resolves true.

- [ ] **Step 2: Run route tests and verify RED**

Run: `pnpm test:unit src/app/api/auth/register/route.test.ts`

Expected: FAIL because the route ignores limiter availability and Turnstile.

- [ ] **Step 3: Implement server enforcement**

Keep ordering exact: same-origin → limiter → body/credential validation →
Turnstile → Medusa registration. Use:

```ts
const ip = clientIp(request)
const rate = await limiter.consume(ip)
if (rate.status === 'unavailable' && !isLoopbackHost(request.headers.get('host'))) {
  return errorResponse('rate_limit_unavailable', 503)
}
if (rate.status === 'limited') return errorResponse('rate_limited', 429)
// parse and validate body
if (!(await verifyTurnstile(turnstileToken, request.headers.get('host'), ip))) {
  return errorResponse('bot_check_failed', 403)
}
```

- [ ] **Step 4: Add failing UI tests for token, disable, and reset behavior**

Use the existing `@marsidev/react-turnstile` mock/ref pattern from
`src/components/support/support-chat.test.tsx`. For both registration surfaces,
prove that the submit button is disabled before `onSuccess`, the JSON contains
`turnstileToken`, and every non-OK registration response calls widget `reset()`.
For inline checkout, prove 409 changes to sign-in mode and editing the email
returns to registration with a fresh challenge.

- [ ] **Step 5: Run UI tests and verify RED**

Run:

```bash
pnpm test:unit 'src/app/[locale]/(auth)/register/register-page-client.test.tsx' \
  src/components/pro/checkout/account-step.test.tsx
```

Expected: FAIL because neither registration surface renders or submits Turnstile.

- [ ] **Step 6: Implement the invisible registration challenges**

Mirror the support component’s hydration-safe host resolution:

```ts
const siteKey = useSyncExternalStore(
  subscribeNever,
  () => resolveTurnstileSiteKey(window.location.host),
  () => undefined
)
const verifying = siteKey === undefined || (Boolean(siteKey) && !turnstileToken)
```

Render an invisible `Turnstile`, clear tokens on error/expiry, include the token
in registration JSON, disable only registration submits while verifying, and
reset after every non-OK response. Localhost remains widget-free and admitted by
the existing server verifier; do not gate on `NODE_ENV`.

Add localized `bot_check_failed` and `rate_limit_unavailable` auth messages to
every locale with identical key shape.

- [ ] **Step 7: Verify GREEN**

Run:

```bash
pnpm test:unit src/app/api/auth/register/route.test.ts \
  'src/app/[locale]/(auth)/register/register-page-client.test.tsx' \
  src/components/pro/checkout/account-step.test.tsx \
  src/lib/support/turnstile.test.ts src/lib/support/turnstile-keys.test.ts
pnpm i18n:hardcoded
```

Expected: focused tests and i18n guard pass.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/auth/register src/app/'[locale]'/'(auth)'/register \
  src/components/pro/checkout/account-step.tsx \
  src/components/pro/checkout/account-step.test.tsx messages
git commit -m "fix(security): require Turnstile for registration"
```

---

### Task 3: Rate-limit payment-session allocation by IP and customer

**Files:**
- Modify: `src/app/api/store/cart/payment-sessions/route.ts`
- Modify: `src/app/api/store/cart/payment-sessions/route.test.ts`
- Modify: `src/lib/store-cart-errors.ts`

**Interfaces:**
- Consumes: `RateLimitResult.status` and `clientIp` from Task 1.
- Produces: IP bucket `checkout:payment-session:ip`, 20 requests / 15 minutes.
- Produces: customer bucket `checkout:payment-session:customer`, 8 requests / 15 minutes.
- Produces: `rate_limited` (429) and `rate_limit_unavailable` (503) store errors.

- [ ] **Step 1: Add failing denial-before-allocation tests**

Mock `createRateLimiter` by prefix and add four cases: IP limited, customer
limited, IP unavailable, customer unavailable. Each must prove:

```ts
expect(response.status).toBe(expectedStatus)
expect(json.errorCode).toBe(expectedCode)
expect(mockGetCart).not.toHaveBeenCalled()
expect(mockCreatePaymentCollection).not.toHaveBeenCalled()
expect(mockCreatePaymentSession).not.toHaveBeenCalled()
```

Also assert the IP limiter consumes the request IP and the customer limiter
consumes `customer.id`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm test:unit src/app/api/store/cart/payment-sessions/route.test.ts`

Expected: FAIL because no allocation limiter exists.

- [ ] **Step 3: Implement dual fail-closed checks**

After `getCustomer()` succeeds but before reading the body or calling `getCart`,
consume the IP bucket then the customer bucket. Return 503 for either
`unavailable` outside strict loopback hosts, 429 for either `limited`, and
continue only when both are `allowed` (or unavailable on strict loopback).
Add both codes to `StoreCartErrorCode`.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
pnpm test:unit src/app/api/store/cart/payment-sessions/route.test.ts \
  src/components/pro/complete-cart.test.ts src/components/pro/checkout-client.test.tsx
```

Expected: focused route and checkout-client tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/store/cart/payment-sessions/route.ts \
  src/app/api/store/cart/payment-sessions/route.test.ts src/lib/store-cart-errors.ts
git commit -m "fix(security): limit payment-session allocation"
```

---

### Task 4: Repair case-insensitive owner “View as” and surface failures

**Files:**
- Modify: `src/lib/discord/medusa-admin.ts`
- Modify: `src/lib/discord/medusa-admin.test.ts`
- Modify: `src/app/[locale]/account/admin/page.tsx`
- Modify: `src/app/[locale]/account/admin/actions.ts`
- Modify: `src/app/[locale]/account/admin/actions.test.ts`
- Modify: all `messages/*.json` locale files under `account.admin`

**Interfaces:**
- Preserves: `findAdminCustomerByEmail(email): Promise<MedusaCustomer | null>`.
- Preserves: `startImpersonationAction` authorization and read-only cookie behavior.
- Produces: visible localized `not_found`, `rate_limited`, and `forbidden` action errors.

- [ ] **Step 1: Add the failing lookup regression tests**

Prove the adapter requests `q=cadencechatfield...` rather than `email=`, accepts
a mixed-case returned email by exact normalized comparison, rejects partial
matches returned by `q`, and still prefers an exact registered customer over an
exact guest duplicate.

- [ ] **Step 2: Run the lookup test and verify RED**

Run: `pnpm test:unit src/lib/discord/medusa-admin.test.ts`

Expected: FAIL because the current exact `email=` query is case-sensitive.

- [ ] **Step 3: Implement the proven query seam**

```ts
const needle = email.trim().toLowerCase()
const query = new URLSearchParams({
  q: needle,
  limit: '100',
  fields: 'id,email,first_name,last_name,phone,has_account,metadata,created_at,updated_at',
})
const exact = (page.customers ?? []).filter(
  (customer) => customer.email.trim().toLowerCase() === needle
)
return exact.find((customer) => customer.has_account) ?? exact[0] ?? null
```

Do not fall back to a partial `q` result.

- [ ] **Step 4: Add a failing admin-page action-state test**

Convert the form to a small client component using `useActionState`, or an
equivalent existing server-action pattern, and prove `not_found` and
`rate_limited` are displayed rather than discarded. The action state must not
expose the searched email in logs or HTML beyond the input itself.

- [ ] **Step 5: Implement localized visible failures and verify GREEN**

Run:

```bash
pnpm test:unit src/lib/discord/medusa-admin.test.ts \
  'src/app/[locale]/account/admin/actions.test.ts' \
  src/lib/impersonation.test.ts src/lib/impersonation.integration.test.ts \
  src/middleware.test.ts
```

Expected: all lookup, cookie, middleware-scope, and read-only tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/discord/medusa-admin.ts src/lib/discord/medusa-admin.test.ts \
  src/app/'[locale]'/account/admin messages
git commit -m "fix(admin): make view-as email lookup case-insensitive"
```

---

### Task 5: Enforce the security hold in `wcpos-com` sessions

**Files:**
- Create: `src/lib/customer-security-hold.ts`
- Create: `src/lib/customer-security-hold.test.ts`
- Modify: `src/lib/api/errors.ts`
- Modify: `src/lib/medusa-auth.ts`
- Modify: `src/lib/medusa-auth.test.ts`
- Modify: `src/app/api/auth/login/route.ts`
- Modify: `src/app/api/auth/login/route.test.ts`
- Modify: `src/app/api/auth/reset-password/route.ts`
- Modify: `src/app/api/auth/reset-password/route.test.ts`
- Modify: `src/lib/oauth.ts`
- Modify: `src/lib/oauth.test.ts`
- Modify: `src/lib/oauth-error-codes.ts`
- Modify: `src/app/api/auth/[provider]/callback/route.ts`
- Modify: `src/app/api/auth/[provider]/callback/route.test.ts`
- Modify: `src/app/[locale]/(auth)/login/login-page-client.tsx`
- Modify: `src/components/pro/checkout/account-step.tsx`
- Modify: all `messages/*.json` auth/checkout hold copy

**Interfaces:**
- Produces: `isCustomerSecurityHeld(metadata): boolean`, true only for `security_hold.active === true`.
- Produces: `AccountSecurityHoldError extends ApiError`, HTTP 403 and public code `account_security_hold` / legacy code `ACCOUNT_SECURITY_HOLD`.
- Produces: `getCustomerForToken(token): Promise<MedusaCustomer | null>` and `assertCustomerAccess(token): Promise<MedusaCustomer>`.
- Preserves: `getCustomer()` checks impersonation first, so the owner can inspect held targets.

- [ ] **Step 1: Add failing pure predicate and candidate-token tests**

```ts
expect(isCustomerSecurityHeld({ security_hold: { active: true } })).toBe(true)
expect(isCustomerSecurityHeld({ security_hold: { active: false } })).toBe(false)
expect(isCustomerSecurityHeld({ security_hold: true })).toBe(false)
```

Add adapter tests proving `assertCustomerAccess` returns an ordinary customer,
throws `AccountSecurityHoldError` for a held customer, and never treats malformed
metadata as a hold.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
pnpm test:unit src/lib/customer-security-hold.test.ts src/lib/medusa-auth.test.ts
```

Expected: FAIL because the predicate and token-explicit resolver do not exist.

- [ ] **Step 3: Implement the domain seam and existing-session denial**

`getCustomerForToken` must call `/store/customers/me` with the explicit candidate
token and publishable key. `assertCustomerAccess` throws the typed hold error.
`getSessionCustomer` reuses the resolver and returns null for held customers.
`getCustomer` retains this exact ordering:

```ts
const impersonation = await getImpersonation()
if (impersonation) return getAdminCustomerById(impersonation.targetId)
return getSessionCustomer()
```

- [ ] **Step 4: Add failing session-write tests**

Cover email login, post-reset login, and OAuth. In each path, a held candidate
must never call `setAuthToken`. Email login returns 403 +
`account_security_hold`; reset succeeds but returns `signedIn: false`; OAuth
redirects to login with `error=account_security_hold`.

- [ ] **Step 5: Run session-write tests and verify RED**

Run:

```bash
pnpm test:unit src/app/api/auth/login/route.test.ts \
  src/app/api/auth/reset-password/route.test.ts src/lib/oauth.test.ts \
  'src/app/api/auth/[provider]/callback/route.test.ts'
```

Expected: FAIL because all three paths currently persist the token first.

- [ ] **Step 6: Enforce before cookie writes and add customer-safe copy**

Call `assertCustomerAccess(token)` immediately before every `setAuthToken(token)`
in login/reset/OAuth session creation. Classify the typed error without logging
it as an unexpected credential failure. Add `account_security_hold` to OAuth
error codes and localized login/inline-checkout messages directing the customer
to support without alleging fraud.

- [ ] **Step 7: Verify GREEN**

Run:

```bash
pnpm test:unit src/lib/customer-security-hold.test.ts src/lib/medusa-auth.test.ts \
  src/app/api/auth/login/route.test.ts src/app/api/auth/reset-password/route.test.ts \
  src/lib/oauth.test.ts 'src/app/api/auth/[provider]/callback/route.test.ts' \
  'src/app/[locale]/(auth)/login/login-page-client.test.tsx' \
  src/components/pro/checkout/account-step.test.tsx
```

Expected: all hold/session tests pass and no held path writes a cookie.

- [ ] **Step 8: Commit**

```bash
git add src/lib/customer-security-hold* src/lib/api/errors.ts src/lib/medusa-auth* \
  src/app/api/auth src/lib/oauth* src/app/'[locale]'/'(auth)'/login \
  src/components/pro/checkout/account-step* messages
git commit -m "fix(security): deny held customer sessions"
```

---

### Task 6: Add authoritative Medusa hold enforcement and exact-ID remediation

**Repository:** `/Users/kilbot/Projects/wcpos-medusa`

**Files:**
- Create: `src/lib/customer-security-hold.ts`
- Create: `src/lib/__tests__/customer-security-hold.unit.spec.ts`
- Modify: `src/api/middlewares.ts`
- Modify: `src/api/__tests__/middlewares.unit.spec.ts`
- Create: `src/scripts/security-hold-customers.ts`
- Create: `src/scripts/__tests__/security-hold-customers.unit.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: optional bearer authentication plus `denyHeldCustomer` middleware on the exact matcher `/^\/store\/(?:customers(?:\/|$)|orders(?:\/|$)|carts(?:\/|$)|payment-collections(?:\/|$))/`.
- Produces: HTTP 403 `{ code: 'ACCOUNT_SECURITY_HOLD', type: 'not_allowed', message: 'Account access is temporarily restricted.' }` for a held actor.
- Produces: `pnpm security-hold:customers -- --apply|--release`, default dry-run, operating only on the three audited IDs compiled into the incident script.

- [ ] **Step 1: Create a Medusa worktree from current `origin/main` and verify baseline**

```bash
git -C /Users/kilbot/Projects/wcpos-medusa fetch origin main
git -C /Users/kilbot/Projects/wcpos-medusa worktree add \
  /Users/kilbot/Projects/wcpos-medusa/.worktrees/checkout-abuse-hardening \
  -b codex/checkout-abuse-hardening origin/main
```

Run the existing unit suite in the new worktree before edits. Stop and report if
the baseline fails.

- [ ] **Step 2: Add failing middleware tests**

Test the pure middleware with no actor (continues), ordinary customer
(continues), held customer (403, no `next`), malformed hold metadata
(continues), and customer lookup failure (delegates the error). Verify the API
configuration uses optional bearer authentication:

```ts
authenticate('customer', ['bearer'], {
  allowUnauthenticated: true,
  allowUnregistered: true,
})
```

followed by `denyHeldCustomer` for the four sensitive store route families.
Use the anchored regex above so similarly prefixed routes cannot match by
accident.

- [ ] **Step 3: Run middleware tests and verify RED**

Run:

```bash
pnpm test:unit src/lib/__tests__/customer-security-hold.unit.spec.ts \
  src/api/__tests__/middlewares.unit.spec.ts
```

Expected: FAIL because the backend hold middleware does not exist.

- [ ] **Step 4: Implement authoritative denial and verify GREEN**

Resolve `Modules.CUSTOMER` only when `req.auth_context?.actor_id` exists, retrieve
that exact customer, and deny only strict `metadata.security_hold.active === true`.
Public catalog traffic and anonymous carts continue because optional auth with no
actor calls `next()`.

- [ ] **Step 5: Add failing exact-ID script tests**

The script contains the audited IDs in a single immutable array (IDs only; no
emails) and must:

1. preflight-retrieve all three and abort before writes if any is absent;
2. dry-run by default;
3. require `--apply` to set the hold and `--release` to remove it;
4. merge existing metadata;
5. preserve the original `placed_at` on repeat apply;
6. delete only `security_hold` on release;
7. log IDs/coarse action only.

Use the fixed reason `checkout_abuse_2026_07_12`.

- [ ] **Step 6: Run script tests and verify RED**

Run: `pnpm test:unit src/scripts/__tests__/security-hold-customers.unit.spec.ts`

Expected: FAIL because the script does not exist.

- [ ] **Step 7: Implement script, package command, and verify GREEN**

Add:

```json
"security-hold:customers": "medusa exec ./src/scripts/security-hold-customers.ts"
```

Run the script unit tests, middleware tests, Medusa type-check, and lint.

- [ ] **Step 8: Commit in the Medusa worktree**

```bash
git add src/lib/customer-security-hold.ts src/lib/__tests__/customer-security-hold.unit.spec.ts \
  src/api/middlewares.ts src/api/__tests__/middlewares.unit.spec.ts \
  src/scripts/security-hold-customers.ts \
  src/scripts/__tests__/security-hold-customers.unit.spec.ts package.json
git commit -m "fix(security): enforce customer security holds"
```

---

### Task 7: Full verification, provision infrastructure, deploy, and apply holds

**Repositories:** both worktrees.

- [ ] **Step 1: Run full local validation in `wcpos-com`**

```bash
pnpm lint
pnpm type-check
pnpm test:unit
pnpm test:e2e
pnpm build
```

Expected: every command exits zero. Record any pre-existing warning separately;
do not call it introduced or fixed without comparable baseline evidence.

- [ ] **Step 2: Run full local validation in `wcpos-medusa`**

Use the repository’s package scripts for full lint, type-check/build, and unit
tests. Expected: every command exits zero.

- [ ] **Step 3: Provision Upstash before deploying fail-closed code**

Create one EU-region Redis database dedicated to `wcpos-com` rate limits. Add
`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to Vercel Preview and
Production as encrypted values. Confirm `vercel env ls --cwd /Users/kilbot/Projects/wcpos-com`
lists both names for both environments; never print their values.

If account creation requires an interactive owner login or billing acceptance,
stop at this step and report that precise external block. Do not deploy code
that would turn every production registration/payment-session request into 503.

- [ ] **Step 4: Push both branches and open ready PRs**

Follow repository pre-push checks, push each `codex/checkout-abuse-hardening`
branch, and open companion PRs whose bodies link each other and document:

- incident counts and timestamps without licence keys/card data;
- observed root cause labels;
- exact validation commands/results;
- behavior changes/regressions;
- rollout order: Medusa first, then Vercel, then holds;
- rollback steps.

- [ ] **Step 5: Deploy Medusa and verify authoritative hold middleware dark**

Deploy the approved Medusa commit before any hold metadata is applied. Verify
public catalog, ordinary authenticated customer, cart ownership, admin login,
and readiness. Do not use a real payment.

- [ ] **Step 6: Deploy `wcpos-com` and run no-charge smoke checks**

Verify:

1. registration without a valid Turnstile token is 403;
2. invalid bot token is 403;
3. ordinary login remains independent of Upstash;
4. payment-session route reports neither 503 nor missing configuration for an
   ordinary authenticated staging checkout;
5. owner “View as” finds the supplied mixed-case account;
6. no new incident-pattern registrations appear during the observation window.

- [ ] **Step 7: Dry-run and apply exactly three production holds**

In the production Medusa container, run:

```bash
pnpm security-hold:customers
pnpm security-hold:customers -- --apply
pnpm security-hold:customers
```

The first output must say three would be held and zero writes; apply must update
exactly three; final dry-run must say all three are already held. Abort on any
different count.

- [ ] **Step 8: Post-apply verification**

Verify all three exact IDs:

- Medusa metadata has `security_hold.active === true` and the fixed reason;
- direct sensitive Store API access with a held actor is 403;
- email/password login writes no `wcpos-medusa-token` cookie and returns the
  stable hold error;
- owner “View as” still renders customer, order, and suspended licence;
- Keygen remains `SUSPENDED` with zero machines;
- Stripe PaymentIntents, captures, refund totals, and Medusa order records are
  unchanged.

- [ ] **Step 9: Monitor and report evidence labels**

Monitor registration, Turnstile 403, rate-limit 429/503, payment-session, order,
and licence events. Report conclusions as Observed, Inferred, Unverified, or Not
evaluated and include a dedicated behavior-changes/regressions section.
