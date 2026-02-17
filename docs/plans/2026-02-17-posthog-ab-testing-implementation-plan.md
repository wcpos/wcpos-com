# PostHog A/B Testing Cutover Implementation Plan

**Goal:** Replace Umami with self-hosted PostHog and launch server-assigned A/B testing for Pro checkout conversion on `/pro` and `/pro/checkout`.

**Architecture:** Add a small analytics boundary (`track`, `getExperimentVariant`, identity helpers) so UI/server code stays vendor-neutral. Assign experiment variant server-side using a first-party distinct ID cookie and pass variant context through pricing and checkout flows. Fail open to control when analytics services are unavailable.

**Tech Stack:** Next.js 16 App Router, React 19, Vitest, Playwright, PostHog JS + Node SDK.

---

## Task 1: Add analytics config + remove Umami script path

**Files:**
- Create: `src/lib/analytics/config.ts`
- Create: `src/lib/analytics/config.test.ts`
- Modify: `.env.example`
- Modify: `src/utils/env.ts`
- Modify: `src/app/[locale]/layout.tsx`

**Step 1: Write the failing test**

```ts
// src/lib/analytics/config.test.ts
import { describe, it, expect } from 'vitest'
import { getAnalyticsConfig } from './config'

describe('getAnalyticsConfig', () => {
  it('disables analytics when PostHog keys are missing', () => {
    expect(getAnalyticsConfig({} as NodeJS.ProcessEnv).enabled).toBe(false)
  })

  it('enables analytics when host + key exist', () => {
    const config = getAnalyticsConfig({
      NEXT_PUBLIC_POSTHOG_HOST: 'https://analytics.wcpos.com',
      NEXT_PUBLIC_POSTHOG_KEY: 'phc_test',
    } as NodeJS.ProcessEnv)

    expect(config.enabled).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/analytics/config.test.ts`
Expected: FAIL (`Cannot find module './config'`)

**Step 3: Write minimal implementation**

```ts
// src/lib/analytics/config.ts
export function getAnalyticsConfig(env: NodeJS.ProcessEnv) {
  const host = env.NEXT_PUBLIC_POSTHOG_HOST
  const key = env.NEXT_PUBLIC_POSTHOG_KEY

  return {
    enabled: Boolean(host && key),
    host,
    key,
    serverKey: env.POSTHOG_API_KEY,
  }
}
```

Then:
- Replace Umami vars in `.env.example` with PostHog vars.
- Add PostHog vars to `src/utils/env.ts` schema.
- Remove Umami `<Script ... data-website-id=...>` from `src/app/[locale]/layout.tsx`.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/analytics/config.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add .env.example src/utils/env.ts src/app/[locale]/layout.tsx src/lib/analytics/config.ts src/lib/analytics/config.test.ts
git commit -m "feat: add PostHog analytics config and remove Umami script"
```

---

## Task 2: Add first-party distinct ID cookie in middleware

**Files:**
- Create: `src/lib/analytics/distinct-id.ts`
- Create: `src/lib/analytics/distinct-id.test.ts`
- Modify: `src/middleware.ts`
- Modify: `src/middleware.test.ts`

**Step 1: Write the failing tests**

```ts
// src/lib/analytics/distinct-id.test.ts
import { describe, it, expect } from 'vitest'
import { ANALYTICS_DISTINCT_ID_COOKIE, newDistinctId } from './distinct-id'

describe('distinct id', () => {
  it('uses stable cookie name', () => {
    expect(ANALYTICS_DISTINCT_ID_COOKIE).toBe('wcpos-distinct-id')
  })

  it('creates non-empty ids', () => {
    expect(newDistinctId().length).toBeGreaterThan(20)
  })
})
```

Add middleware expectation:
- Existing authenticated `/pro/checkout` request should set `wcpos-distinct-id` cookie when missing.

**Step 2: Run tests to verify failure**

Run: `pnpm vitest run src/lib/analytics/distinct-id.test.ts src/middleware.test.ts`
Expected: FAIL (missing module + missing cookie assertion)

**Step 3: Implement cookie helper + middleware set logic**

```ts
// src/lib/analytics/distinct-id.ts
export const ANALYTICS_DISTINCT_ID_COOKIE = 'wcpos-distinct-id'

export function newDistinctId() {
  return crypto.randomUUID()
}
```

In `src/middleware.ts`:
- After creating the response, if cookie missing, set httpOnly=false, sameSite=lax, secure in production, maxAge=31536000.
- Apply for non-API routes and for redirects so `/login` flow keeps identity continuity.

**Step 4: Re-run tests**

Run: `pnpm vitest run src/lib/analytics/distinct-id.test.ts src/middleware.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/analytics/distinct-id.ts src/lib/analytics/distinct-id.test.ts src/middleware.ts src/middleware.test.ts
git commit -m "feat: issue analytics distinct id cookie in middleware"
```

---

## Task 3: Build server PostHog service with timeout + control fallback

**Files:**
- Create: `src/services/core/analytics/posthog-service.ts`
- Create: `src/services/core/analytics/posthog-service.test.ts`

**Step 1: Write failing tests**

```ts
// src/services/core/analytics/posthog-service.test.ts
import { describe, it, expect, vi } from 'vitest'
import { resolveProCheckoutVariant } from './posthog-service'

describe('resolveProCheckoutVariant', () => {
  it('returns control when analytics disabled', async () => {
    const variant = await resolveProCheckoutVariant({
      distinctId: 'anon_1',
      analyticsEnabled: false,
    })
    expect(variant).toBe('control')
  })

  it('returns control on timeout', async () => {
    const variant = await resolveProCheckoutVariant({
      distinctId: 'anon_1',
      timeoutMs: 1,
      evaluate: () => new Promise(() => {}),
    })
    expect(variant).toBe('control')
  })
})
```

**Step 2: Run tests to verify failure**

Run: `pnpm vitest run src/services/core/analytics/posthog-service.test.ts`
Expected: FAIL (module missing)

**Step 3: Implement minimal service**

```ts
// src/services/core/analytics/posthog-service.ts
export type ProCheckoutVariant = 'control' | 'value_copy'

export async function resolveProCheckoutVariant({
  distinctId,
  analyticsEnabled = true,
  timeoutMs = 150,
  evaluate,
}: {
  distinctId: string
  analyticsEnabled?: boolean
  timeoutMs?: number
  evaluate?: () => Promise<string | boolean | null | undefined>
}): Promise<ProCheckoutVariant> {
  if (!analyticsEnabled) return 'control'

  const evalPromise = evaluate ? evaluate() : Promise.resolve('control')
  const timeoutPromise = new Promise<'__timeout__'>((resolve) => {
    setTimeout(() => resolve('__timeout__'), timeoutMs)
  })

  const result = await Promise.race([evalPromise, timeoutPromise])
  if (result === '__timeout__') return 'control'

  return result === 'value_copy' ? 'value_copy' : 'control'
}
```

**Step 4: Re-run tests**

Run: `pnpm vitest run src/services/core/analytics/posthog-service.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/core/analytics/posthog-service.ts src/services/core/analytics/posthog-service.test.ts
git commit -m "feat: add PostHog server variant resolver with timeout fallback"
```

---

## Task 4: Wire server-side experiment assignment for `/pro` and `/pro/checkout`

**Files:**
- Modify: `src/app/[locale]/(main)/pro/page.tsx`
- Modify: `src/components/pro/pricing-card.tsx`
- Create: `src/components/pro/pricing-card.test.tsx`
- Modify: `src/app/[locale]/(main)/pro/checkout/page.tsx`
- Modify: `src/components/pro/checkout-client.tsx`
- Modify: `src/components/pro/checkout-client.test.tsx`

**Step 1: Write failing tests**

- In `pricing-card.test.tsx`, assert checkout URL includes `exp=pro_checkout_v1` and `exp_variant=<variant>`.
- In `checkout-client.test.tsx`, assert component uses prop `selectedVariantId` (not `useSearchParams`) to create line items.

**Step 2: Run tests to verify failure**

Run: `pnpm vitest run src/components/pro/pricing-card.test.tsx src/components/pro/checkout-client.test.tsx`
Expected: FAIL (missing props / query expectation)

**Step 3: Implement minimal server wiring**

- In `/pro/page.tsx`, read distinct ID cookie and resolve experiment variant server-side.
- Pass `experimentVariant` into `PricingCard`.
- In `PricingCard`, append experiment params to checkout link.
- In `/pro/checkout/page.tsx`, resolve variant server-side again and pass both:
  - `selectedVariantId` (product variant)
  - `experimentVariant` (A/B assignment)
- In `CheckoutClient`, stop reading variant from `useSearchParams`; read from props.

Example prop shape:

```ts
interface CheckoutClientProps {
  customerEmail?: string
  selectedVariantId?: string
  experimentVariant: 'control' | 'value_copy'
}
```

**Step 4: Re-run tests**

Run: `pnpm vitest run src/components/pro/pricing-card.test.tsx src/components/pro/checkout-client.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/[locale]/(main)/pro/page.tsx src/components/pro/pricing-card.tsx src/components/pro/pricing-card.test.tsx src/app/[locale]/(main)/pro/checkout/page.tsx src/components/pro/checkout-client.tsx src/components/pro/checkout-client.test.tsx
git commit -m "feat: assign checkout experiment server-side across pro funnel"
```

---

## Task 5: Replace Umami event attributes with analytics tracker calls

**Files:**
- Create: `src/lib/analytics/client-events.ts`
- Modify: `src/components/main/site-header.tsx`
- Modify: `src/components/main/site-header.test.tsx`
- Modify: `src/components/pro/pricing-card.tsx`
- Modify: `src/app/[locale]/(auth)/login/page.tsx`

**Step 1: Write failing test updates**

- `site-header.test.tsx`: replace `data-umami-event` assertions with `trackClientEvent` spy assertions.
- Add assertion that Pro link click emits `click_pro_cta`.

**Step 2: Run test to verify failure**

Run: `pnpm vitest run src/components/main/site-header.test.tsx`
Expected: FAIL (`trackClientEvent` not called / not implemented)

**Step 3: Implement tracker + UI calls**

```ts
// src/lib/analytics/client-events.ts
export function trackClientEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  const posthog = (window as Window & { posthog?: { capture: Function } }).posthog
  posthog?.capture?.(event, properties)
}
```

Then remove `data-umami-event` props and attach `onClick={() => trackClientEvent(...)}` in:
- header Sign In + Pro CTA links
- login OAuth buttons
- pricing card checkout CTA

**Step 4: Re-run tests**

Run: `pnpm vitest run src/components/main/site-header.test.tsx src/components/pro/checkout-client.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/analytics/client-events.ts src/components/main/site-header.tsx src/components/main/site-header.test.tsx src/components/pro/pricing-card.tsx src/app/[locale]/(auth)/login/page.tsx
git commit -m "refactor: replace Umami attributes with analytics tracker calls"
```

---

## Task 6: Track checkout conversion server-side with validated variant context

**Files:**
- Create: `src/app/api/store/cart/complete/route.test.ts`
- Modify: `src/app/api/store/cart/complete/route.ts`
- Modify: `src/components/pro/checkout-form.tsx`

**Step 1: Write failing route tests**

Add tests for:
- 401 when unauthenticated (existing behavior preserved)
- successful completion calls tracker with `checkout_completed`, `experiment`, `variant`, `distinct_id`
- when tracking throws, route still returns success from completed cart response

**Step 2: Run test to verify failure**

Run: `pnpm vitest run src/app/api/store/cart/complete/route.test.ts`
Expected: FAIL (test missing / tracker not called)

**Step 3: Implement minimal tracking path**

- Extend `CheckoutForm` request body to include server-provided experiment metadata.
- In `route.ts`, resolve authoritative variant server-side using distinct ID cookie before tracking.
- Emit server-side conversion event after successful `completeCart`.
- Guard tracking in `try/catch` so checkout never fails because analytics failed.

**Step 4: Re-run test**

Run: `pnpm vitest run src/app/api/store/cart/complete/route.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/store/cart/complete/route.ts src/app/api/store/cart/complete/route.test.ts src/components/pro/checkout-form.tsx
git commit -m "feat: add resilient server-side checkout conversion tracking"
```

---

## Task 7: E2E coverage + hard-cutover cleanup verification

**Files:**
- Modify: `e2e/pro.spec.ts`
- Modify: `e2e/pro-checkout.spec.ts`
- Modify: `docs/plans/2026-02-17-posthog-ab-testing-design.md` (status/checklist update)

**Step 1: Add failing e2e expectations**

- `e2e/pro.spec.ts`: assert pricing CTA links include experiment query metadata.
- `e2e/pro-checkout.spec.ts`: assert checkout still loads with server-assigned experiment and no client-side flicker/error path.

**Step 2: Run targeted e2e to confirm failure**

Run: `pnpm playwright test e2e/pro.spec.ts e2e/pro-checkout.spec.ts`
Expected: FAIL before implementation updates settle.

**Step 3: Make minimal e2e updates pass**

- Update selectors/assertions to new CTA labels (if variant copy changes).
- Update URL assertions for added `exp` and `exp_variant` params.

**Step 4: Full verification run**

Run all required checks:

```bash
pnpm lint
pnpm test:unit
pnpm build
pnpm playwright test e2e/pro.spec.ts e2e/pro-checkout.spec.ts
rg -n "umami|NEXT_PUBLIC_UMAMI|data-umami-event" src .env.example
```

Expected:
- lint/test/build pass
- targeted e2e pass
- final `rg` returns no matches in app code/env.

**Step 5: Commit**

```bash
git add e2e/pro.spec.ts e2e/pro-checkout.spec.ts docs/plans/2026-02-17-posthog-ab-testing-design.md
git commit -m "test: cover PostHog experiment flow and remove Umami references"
```

---

## Parallel Infrastructure Follow-up (separate repo)

Run in `/Users/kilbot/Projects/wcpos-infra` after app-side branch is stable:
- Modify: `services/platform/docker-compose.yml` (replace `umami` service with PostHog service stack)
- Modify: `services/platform/env.example` (remove `UMAMI_*`, add `POSTHOG_*`)
- Modify: `services/platform/README.md` and root `README.md` service table
- Validate: `docker compose config` + service health checks

---

## Final PR Checklist

- [ ] All Umami references removed from `wcpos-com` runtime paths.
- [ ] `/pro` and `/pro/checkout` use server-assigned variants.
- [ ] Checkout succeeds when PostHog is slow/down (control fallback).
- [ ] Event payloads include experiment + variant metadata.
- [ ] Unit + e2e tests cover assignment, fallback, and conversion tracking.
