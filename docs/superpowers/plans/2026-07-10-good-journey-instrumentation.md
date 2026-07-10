# Good Journey Instrumentation Implementation Plan

> **Execution:** Implement in the order below. The Medusa PR is the completion
> owner and must deploy before the WCPOS PR.

**Goal:** Produce reliable, consent-gated acquisition-to-download analytics for
all checkout providers while preserving the existing operational safety and
privacy boundaries.

**Architecture:** WCPOS gathers browser session context, validates it on the
server, and stores a namespaced attribution envelope on the cart. Medusa's
`order.placed` subscriber is the authoritative completion source for Stripe,
PayPal, and BTCPay. A versioned ownership marker makes rollout idempotent and
keeps the existing WCPOS completion event as a legacy-cart fallback.

**Repositories:** `wcpos/wcpos-medusa` and `wcpos/wcpos-com`

---

## File map

### `wcpos-medusa`

- Create `src/lib/checkout-analytics.ts`: pure parsing, provider normalization,
  event construction, and deterministic UUID generation.
- Create `src/lib/__tests__/checkout-analytics.unit.spec.ts`: exhaustive event
  contract and privacy tests.
- Modify `src/subscribers/order-completed.ts`: query the required order fields
  and start/await capture without blocking license processing on capture errors.
- Modify `src/subscribers/__tests__/order-completed.unit.spec.ts`: subscriber
  integration, idempotency, missing-consent, and early-return coverage.

### `wcpos-com`

- Create `src/lib/analytics/checkout-attribution.ts` and test: shared bounded
  context validation and metadata contract.
- Modify `src/lib/analytics/posthog-browser.ts` and test: safe browser session-ID
  read after consent/initialization.
- Modify cart creation route/client and tests: whitelist business metadata,
  inject consented attribution, and write the Medusa ownership marker.
- Modify registration clients/route and tests: carry `$session_id` and locale.
- Modify payment-step/provider components and tests: one start and one safe
  failure event per surfaced attempt.
- Modify completion route and tests: capture only legacy unmarked carts.
- Modify download route and tests: capture only successfully served downloads.
- Modify site header and test: desktop/mobile CTA placement.

---

## Phase 1 — Medusa authoritative completion

### Task 1: Create the pure completed-checkout event builder

**Files:**

- Create: `src/lib/checkout-analytics.ts`
- Create: `src/lib/__tests__/checkout-analytics.unit.spec.ts`

1. Create a Medusa worktree from the freshly fetched `origin/main` on branch
   `codex/order-completion-analytics`.
2. Write failing unit tests for:
   - absent or wrong `wcpos_analytics.completion_owner` returns `null`;
   - absent `distinct_id` returns `null`;
   - Stripe, PayPal, and BTCPay provider IDs normalize to `stripe`, `paypal`,
     and `btcpay`;
   - unknown/raw provider values produce only `unknown`;
   - yearly/lifetime handles normalize to their plan IDs;
   - event properties contain plan, plan handle, revenue, currency, experiment,
     variant, locale, `$session_id`, and internal order ID;
   - malformed optional metadata is omitted rather than forwarded;
   - the event contains no email, address, item contents, provider ID, or raw
     metadata;
   - the same order ID always yields the same valid UUID, while different order
     IDs differ.
3. Run the focused test and confirm it fails because the module is absent:

   ```bash
   pnpm test:unit -- src/lib/__tests__/checkout-analytics.unit.spec.ts
   ```

4. Implement a pure `buildCheckoutCompletedEvent(order)` returning the existing
   `PosthogEvent` type or `null`. Keep the metadata owner literal
   `medusa_v1` exported for fixtures. Hash `checkout_completed:<order id>` into
   an RFC-4122-shaped deterministic UUID.
5. Re-run the focused test until green.
6. Commit:

   ```bash
   git add src/lib/checkout-analytics.ts src/lib/__tests__/checkout-analytics.unit.spec.ts
   git commit -m "feat(analytics): build completed checkout events"
   ```

### Task 2: Capture from `order.placed` without delaying license work

**Files:**

- Modify: `src/subscribers/order-completed.ts`
- Modify: `src/subscribers/__tests__/order-completed.unit.spec.ts`

1. Mock `capturePosthogEvents` and write failing subscriber tests proving:
   - a marked order starts exactly one `checkout_completed` capture;
   - Stripe, PayPal, and BTCPay order shapes reach the builder;
   - unmarked/no-consent orders do not call PostHog;
   - an existing-license early return still settles the capture;
   - PostHog rejection/unavailability does not prevent license creation,
     renewal, metadata updates, notifications, or owner alerts.
2. Run the subscriber test and confirm red:

   ```bash
   pnpm test:unit -- src/subscribers/__tests__/order-completed.unit.spec.ts
   ```

3. Extend the existing order graph query with `total`, `currency_code`, and
   `payment_collections.payments.provider_id`. Build the event once and start
   capture concurrently with the existing license work. Await the non-throwing
   capture promise before all handler exits so the long-lived worker does not
   abandon it, but never throw or change order-processing outcomes based on the
   capture result.
4. Re-run the focused tests, then all Medusa unit tests:

   ```bash
   pnpm test:unit -- src/lib/__tests__/checkout-analytics.unit.spec.ts \
     src/subscribers/__tests__/order-completed.unit.spec.ts
   pnpm test:unit
   ```

5. Commit:

   ```bash
   git add src/subscribers/order-completed.ts \
     src/subscribers/__tests__/order-completed.unit.spec.ts
   git commit -m "feat(analytics): capture every completed Pro checkout"
   ```

### Task 3: Validate and publish the Medusa companion PR

1. Classify as security-sensitive payment/event logic.
2. Run:

   ```bash
   pnpm test:unit
   pnpm build
   ```

3. Run diff review, architectural critique, security review, independent Codex
   review, and adversarial review. Resolve validated findings and repeat checks.
4. Rebase on `origin/main`, check upstream/merged branch state, push, and open a
   ready PR. Its design decisions must say:
   - `order.placed` is the only all-provider completion authority;
   - only `medusa_v1` marked orders capture;
   - deterministic UUIDs make subscriber redelivery idempotent;
   - deploy this PR before the WCPOS companion.
5. Record the PR URL for the WCPOS PR body.

---

## Phase 2 — WCPOS consented attribution handoff

### Task 4: Add the shared attribution contract and browser session reader

**Files:**

- Create: `src/lib/analytics/checkout-attribution.ts`
- Create: `src/lib/analytics/checkout-attribution.test.ts`
- Modify: `src/lib/analytics/posthog-browser.ts`
- Modify: `src/lib/analytics/posthog-browser.test.ts`

1. Write failing tests for a pure parser that:
   - accepts a bounded non-empty PostHog session ID;
   - rejects non-strings, empty/oversized strings, and control characters;
   - validates locale through the existing canonical-locale helper;
   - accepts only `pro_checkout_v1` and known checkout variants;
   - emits a namespaced `wcpos_analytics` envelope with owner `medusa_v1` only
     when a server-owned consented distinct ID exists.
2. Add browser tests for `getPostHogSessionId()` returning the SDK value only
   when consent is granted and `window.posthog.get_session_id` is available;
   missing SDK, denial, malformed values, and exceptions return `undefined`.
3. Run tests and confirm red:

   ```bash
   pnpm test:unit -- src/lib/analytics/checkout-attribution.test.ts \
     src/lib/analytics/posthog-browser.test.ts
   ```

4. Implement the pure contract and the non-throwing browser reader. Do not add
   a dependency or read PostHog persistence cookies directly.
5. Re-run focused tests and commit.

### Task 5: Persist consented context on cart creation

**Files:**

- Modify: `src/components/pro/checkout-client.tsx`
- Modify: `src/components/pro/checkout-client.test.tsx`
- Modify: `src/app/api/store/cart/route.ts`
- Modify: `src/app/api/store/cart/route.test.ts`

1. Write failing client tests showing cart creation sends `analytics.session_id`
   from `getPostHogSessionId()` while preserving locale/experiment/variant.
2. Write failing route tests showing:
   - client-supplied arbitrary metadata and distinct IDs are discarded;
   - locale/experiment/variant are validated and preserved for business use;
   - explicit consent + server cookie adds `wcpos_analytics` with owner,
     distinct ID, session ID, locale, experiment, and variant;
   - denial, conflicting cookies, missing distinct ID, or malformed session ID
     creates no analytics envelope;
   - cart creation still succeeds when analytics context is absent.
3. Run the two focused tests and confirm red.
4. Use `readAnalyticsConsentFromCookieHeader` and the server request's distinct
   ID cookie. Never trust a distinct ID from JSON. Replace the current broad
   metadata forwarding with the explicit business/analytics whitelist.
5. Re-run focused tests and commit.

### Task 6: Keep signup in the originating browser session

**Files:**

- Modify: `src/components/pro/checkout/account-step.tsx`
- Modify: `src/components/pro/checkout-client.test.tsx`
- Modify: `src/app/[locale]/(auth)/register/register-page-client.tsx`
- Modify: `src/app/[locale]/(auth)/register/register-page-client.test.tsx`
- Modify: `src/app/api/auth/register/route.ts`
- Modify: `src/app/api/auth/register/route.test.ts`

1. Write failing tests showing both registration clients include the browser
   session ID when available and omit it safely otherwise.
2. Write failing route tests for valid/malformed/missing session IDs and valid
   locale. Assert `$session_id`/`locale` are added only when valid, and existing
   consent, identity fallback, rate-limit, and registration behavior are
   unchanged.
3. Run focused tests, implement with the shared parser, re-run, and commit.

### Task 7: Make Medusa authoritative only for marked carts

**Files:**

- Modify: `src/app/api/store/cart/complete/route.ts`
- Modify: `src/app/api/store/cart/complete/route.test.ts`

1. Write failing tests proving:
   - marked `medusa_v1` carts do not call route-local
     `trackServerEvent('checkout_completed')`;
   - unmarked pre-deployment carts retain the complete existing event and
     identity fallback;
   - order-pending/non-order results still never emit completion.
2. Run the focused test, implement only the ownership conditional, re-run, and
   commit. Do not otherwise change payment completion behavior.

---

## Phase 3 — Checkout lifecycle and post-purchase events

### Task 8: Capture safe checkout starts and failures centrally

**Files:**

- Create: `src/lib/analytics/checkout-payment-events.ts`
- Create: `src/lib/analytics/checkout-payment-events.test.ts`
- Modify: `src/components/pro/checkout/payment-step.tsx`
- Modify: `src/components/pro/checkout/payment-step.test.tsx` (create if absent)
- Modify: `src/components/pro/checkout-form.tsx` and test
- Modify: `src/components/pro/checkout/express-checkout.tsx` and test
- Modify: `src/components/pro/paypal-button.tsx` and test
- Modify: `src/components/pro/btcpay-button.tsx` and test
- Modify: `src/components/pro/checkout-client.tsx` and test
- Create: `src/app/api/store/cart/analytics-attribution/route.ts` and test

1. Write failing pure-helper tests for the exact safe property allowlist:
   `payment_provider`, `failure_kind`, `plan`, `experiment`, `variant`, and
   `locale`. Assert raw errors, support references, cart/order/payment IDs, and
   gateway codes cannot enter the event payload.
2. Add `onAttempt` callbacks to each provider adapter and failing tests proving
   exactly one callback at the start of a real Stripe card, Stripe express,
   PayPal, or BTCPay payment attempt (not on render or payment-method selection).
3. In `PaymentStep`, pass provider-specific start callbacks and wrap each
   provider's `onFailure`. Write tests proving one `checkout_payment_started`
   and one `checkout_payment_failed` with the correct normalized provider and
   stable failure kind. A null failure reset emits nothing. PayPal's existing
   duplicate suppression remains one event.
4. Pass the canonical plan and locale from `CheckoutClient` into `PaymentStep`.
   Use existing plan-handle helpers; do not infer from display copy.
5. Before every real provider attempt, await a same-origin attribution refresh
   route. It authenticates and binds the cart to the caller, re-reads current
   consent and the server distinct-ID cookie, then replaces the envelope for
   granted consent or removes it for missing/withdrawn consent. Provider
   invocation still proceeds if this analytics-only refresh fails. Add tests
   for grant, withdrawal, ownership rejection, refresh-before-provider ordering,
   and non-blocking failure behavior.
6. Run all touched component/helper tests, implement minimally, and commit.

### Task 9: Capture successful Pro downloads

**Files:**

- Modify: `src/app/api/account/download/route.ts`
- Modify: `src/app/api/account/download/route.test.ts`

1. Write failing tests proving `pro_downloaded` fires after successful asset
   retrieval with only `version`, `channel: 'account'`, and validated locale.
2. Assert unauthorized, invalid-token, not-entitled, missing-release, and asset
   failure responses never capture. Assert no IP, user agent, filename, token,
   license, or customer ID is sent.
3. Use `trackServerEvent` with the consent-cookie distinct ID only; if there is
   no distinct ID, skip capture rather than falling back to customer ID.
4. Preserve the existing operational audit log and streaming response exactly.
5. Run the focused test, implement, re-run, and commit.

### Task 10: Attribute desktop and mobile header CTAs

**Files:**

- Modify: `src/components/main/site-header.tsx`
- Modify: `src/components/main/site-header.test.tsx`

1. Write failing tests that click the desktop and mobile Pro links and expect
   `click_pro_cta` with `location: 'desktop_header'` and `location:
   'mobile_menu'` respectively.
2. Add only the event properties; preserve navigation and styling.
3. Run the focused test, implement, re-run, and commit.

---

## Phase 4 — WCPOS validation and companion PR

### Task 11: Full validation and privacy audit

1. Run focused analytics/checkout tests once more.
2. Run the required full checks:

   ```bash
   pnpm run lint
   pnpm run type-check
   pnpm run test:unit
   pnpm run test:e2e
   pnpm run build
   ```

3. Inspect the complete diff for every new event payload and verify there is no
   email, name, address, IP, user agent, raw provider error, decline code,
   payment intent, token, license key, or order contents.
4. Run correctness review, architectural critique, security review, independent
   Codex review, and adversarial payment/data-loss review. Fix validated findings
   and repeat all affected checks.

### Task 12: Rebase, publish, and verify the WCPOS PR

1. Fetch/rebase on `origin/main` and repeat required checks after conflict
   resolution, if any.
2. Check for gone/merged branches and existing PRs before push.
3. Push `codex/good-journey-instrumentation` and open a ready PR linking the
   Medusa PR under **Companion PRs / cross-repo**.
4. Document these binding design decisions:
   - Medusa owns marked completion events because only it sees every provider;
   - server-derived provider and identity override all browser input;
   - unmarked carts retain the old route capture for safe rollout;
   - checkout failure analytics use only the stable failure taxonomy;
   - analytics never affect registration, payment, license, or download success.
5. Verify the stored PR body Markdown and hand both PRs to CI/review monitoring.

---

## Post-deployment verification

After Medusa deploys and then WCPOS deploys, perform a consented test purchase
for at least one synchronous provider and a BTCPay sandbox/test flow if
available. Query PostHog/ClickHouse and verify:

1. browser pageviews, `signup_completed`, `checkout_payment_started`, and
   `checkout_completed` share one person and `$session_id`;
2. exactly one completion exists per order;
3. provider, plan, revenue, currency, experiment, variant, and locale are set;
4. a successful account download produces `pro_downloaded`;
5. no disallowed properties are present; and
6. an operational failure still reaches Loki/Discord while its analytics event
   contains only provider + stable failure kind.
