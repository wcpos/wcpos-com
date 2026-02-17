# WCPOS PostHog A/B Testing Cutover Design
**Date:** 2026-02-17  
**Status:** App implementation in progress (wcpos-com done; wcpos-infra pending)  
**Primary Goal:** Improve Pro checkout conversion with server-side A/B testing on `/pro` and `/pro/checkout`.

---

## Implementation Status (2026-02-17)

- [x] Replace Umami env/script path in `wcpos-com`
- [x] Add first-party distinct ID cookie in middleware
- [x] Add server-side variant resolution with timeout fallback
- [x] Add server-assigned experiment context to `/pro` and `/pro/checkout`
- [x] Replace Umami click attributes with tracker-based events
- [x] Add resilient server-side conversion tracking on cart completion
- [ ] Replace Umami service with self-hosted PostHog in `wcpos-infra`

---

## Decisions Captured

- Migrate from Umami to **self-hosted PostHog** now (hard cutover; no dual tracking period).
- First experiment scope: **`/pro` + `/pro/checkout`**.
- Assignment strategy: **server-side variant assignment**.
- Identity strategy: **first-party anonymous ID cookie**, merged to account ID on login.
- Infra strategy: replace existing Umami deployment in `wcpos-infra` with PostHog.

---

## Requirements (What)

1. **When** a user visits `/pro` or `/pro/checkout`, the server must resolve experiment variant before rendering variant-sensitive UI.
2. **When** PostHog is unavailable or times out, the app must render the **control variant** and keep checkout fully functional.
3. **While** a visitor remains anonymous, tracking must use a stable first-party distinct ID cookie.
4. **When** a user logs in, anonymous identity must be merged to authenticated identity for experiment/funnel continuity.
5. **When** user actions occur in the Pro funnel, events must include `experiment` and `variant` metadata.
6. **If** client-supplied variant parameters conflict with server assignment, checkout must trust server assignment only.
7. Umami script injection and Umami-specific event attributes must be removed from the website codebase.

---

## Options Considered

### Option A — Direct PostHog Calls in UI
Fastest to ship, but creates tight vendor coupling in components.

### Option B — Analytics Abstraction Layer + PostHog Backend (**Selected**)
Add a small internal tracker/experiment API and keep PostHog details inside one integration boundary.

### Option C — Flags First, Event Tracking Later
Lower initial scope, but weaker measurement quality for marketing decisions.

**Why B:** It keeps this migration quick while avoiding vendor-specific sprawl across UI components.

---

## Selected Design (How)

### 1) Integration Boundary in `wcpos-com`
Create an internal analytics service with neutral methods:
- `getOrCreateDistinctId()`
- `getExperimentVariant({ experiment, distinctId, context })`
- `track(event, props)`
- `mergeIdentity({ anonymousId, accountId })`

This service wraps PostHog SDK/API usage so app components call neutral functions.

### 2) Remove Umami Wiring
- Remove Umami script/env logic from:  
  `/Users/kilbot/Projects/wcpos-com/src/app/[locale]/layout.tsx`
- Remove/replace `data-umami-event` usage in:
  - `/Users/kilbot/Projects/wcpos-com/src/components/main/site-header.tsx`
  - `/Users/kilbot/Projects/wcpos-com/src/components/pro/pricing-card.tsx`
  - `/Users/kilbot/Projects/wcpos-com/src/app/[locale]/(auth)/login/page.tsx`
- Update `.env.example` to PostHog-specific variables and remove Umami variables.

### 3) Server-Side Experiment Assignment
For `/pro` and `/pro/checkout` requests:
1. Read/create first-party distinct ID cookie.
2. Resolve variant server-side.
3. Render variant-specific content server-side (no flicker).
4. Re-validate variant in checkout handlers using server identity.

### 4) Event Schema (Minimum)
Standardize core events:
- `view_pricing`
- `click_start_checkout`
- `checkout_completed`

Common properties:
- `experiment`
- `variant`
- `distinct_id`
- `account_id` (if authenticated)
- `page`
- `funnel_step`

---

## Error Handling and Reliability

- Use short timeout for flag resolution (target: 100–200ms budget).
- On timeout/error: default to control variant.
- Add kill switch env var to disable experiment branching instantly.
- Log variant-resolution failures for operational visibility.

---

## Testing Strategy

### Unit
- Distinct ID cookie creation/persistence.
- Identity merge behavior on login.
- Variant resolver control fallback on timeout/error.
- Tracker payload schema shape.

### E2E
- `/pro` and `/pro/checkout` render consistent server-side variant.
- Checkout flow succeeds under normal and PostHog-degraded conditions.
- Conversion event includes expected experiment metadata.

---

## Implementation Sequence

1. Deploy self-hosted PostHog in `wcpos-infra` (replacing Umami service).
2. Add analytics abstraction in `wcpos-com` and wire env vars.
3. Remove Umami injection and Umami event attributes from UI.
4. Add server-side variant assignment on `/pro` and `/pro/checkout`.
5. Implement funnel events and identity merge.
6. Run unit + e2e coverage for experiment and fallback behavior.
7. Launch first checkout-conversion experiment.

---

## Success Criteria

- First experiment is live on `/pro` + `/pro/checkout` with server-side assignment.
- No checkout regression when PostHog is unavailable.
- Funnel events are queryable with clean `experiment`/`variant` metadata.
- Umami is fully removed from `wcpos-com` and replaced in infra.
