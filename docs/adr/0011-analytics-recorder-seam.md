# Analytics recorder seam: two seams, one shape

Analytics now records events through one small interface — `AnalyticsRecorder`
— with PostHog as a single adapter per runtime and consent gated once at each
runtime's seam. This mirrors the logging "sink" seam (`src/lib/sinks`). It does
**not** merge operational-alert logging and business-metric analytics into one
recorder: they stay two seams that share a shape.

## Context

The logging stack is a deep seam: one `Sink` interface, three adapters
(Discord/Loki/Sentry), composed once in `instrumentation.ts` (server) and
`client-logger.ts` (browser). Callers say `logger.error\`…\`` and never name a
backend; adding/removing a sink touches one adapter + one wiring line.

Analytics had drifted the other way:

- **The GDPR consent gate was re-derived in four action sites** —
  `posthog-browser.ts` (init), `client-events.ts` (browser capture), and
  `posthog-service.ts` twice (experiment bucketing + server capture). Each
  re-decided "granted" independently. (Two further consent reads — the
  middleware distinct-id gate and the banner's display read — are legitimately
  separate and were left alone.)
- **There was no `capture(event)` abstraction.** Callers reached for
  `window.posthog.capture` or the posthog-node client directly.
- **distinct id was plumbed three ways:** posthog-js persistence (browser), a
  function parameter (flag resolution), and a magic `properties.distinct_id`
  (server capture).

"Record that something happened" also forks into two unrelated paths, and a
caller wanting both calls both (see `app/api/store/cart/complete/route.ts`):

- **Operational alert** — `logger.*` → sinks → Discord/Sentry/Loki. Not
  consent-gated (system health, not personal data). Fails **open** (always
  logs; drops to console if a backend is down).
- **Business metric** — PostHog. Consent-gated. Fails **closed**.

## Decision

1. **Analytics copies the sink *shape*.** One interface
   `AnalyticsRecorder { capture(event: AnalyticsEvent): void }` (`lib/analytics/types.ts`),
   synchronous and fire-and-forget like a `Sink`. PostHog is the single adapter
   per runtime: `createPostHogBrowserRecorder` (`lib/analytics/posthog-browser-recorder.ts`)
   and `createPostHogServerRecorder` (`services/core/analytics/posthog-server-recorder.ts`).

2. **Consent is gated once per runtime, at the seam.** The browser composes
   `withConsent(recorder, isAnalyticsGranted)` once in `client-events.ts`; the
   single browser predicate `isAnalyticsGranted()` lives in `consent.ts` and is
   used by both capture and init. Callers of `trackClientEvent` never re-check
   consent. The server keeps its gate in `trackServerEvent` because server
   consent is an **async, request-scoped** read (`cookies()`); `withConsent` is
   the synchronous browser mechanism. "Once at the seam" therefore means **once
   per runtime**, not one function across the client/server boundary — the
   runtimes genuinely read consent differently.

3. **Feature-flag/experiment resolution stays separate.**
   `resolveProCheckoutVariant` is a latency-bound *read* (150ms timeout, abort,
   fail-to-`control`) and is deliberately NOT part of the `capture` write
   interface. It remains a sibling in `posthog-service.ts`.

4. **Operational and business recording stay two seams.** They are not merged
   into one recorder. They have opposite consent semantics (none vs required)
   and opposite failure postures (open vs closed); a single abstraction would
   force one of those to be wrong — either operational logs lost when a visitor
   declines cookies, or analytics captured without consent. The shared thing is
   the *pattern* (interface + adapter + gate-once + silent-drop), not the
   instance. This is exactly the kind of "real behavioral difference" ADR 0003
   warns against flattening behind one name. A caller wanting both composes the
   two seams (as the cart-complete route already does).

## Consequences

- The consent rule has one home per runtime. Changing "what counts as granted"
  is a one-line change, not a four-site hunt where a miss is a GDPR breach
  (capture without consent) or silent data loss (drop with consent).
- `distinctId` is first-class on `AnalyticsEvent`. The server still reads
  `properties.distinct_id` for backward compatibility and the browser still
  lets posthog-js own identity, but the plumbing is now one field.
- Capture is testable by injecting a fake `{ capture }` recorder instead of
  mocking `window.posthog` / `posthog-node` / `fetch`. The four near-identical
  per-consumer consent suites can collapse toward one authoritative
  `withConsent` test plus thin "delegates to the gate" checks.
- **Honesty about depth:** this is currently a *hypothetical* seam for
  swapping vendors — there is exactly one adapter (PostHog) per runtime, so the
  "swap analytics backend" payoff is not yet real and is **not** the
  justification. The real, adapter-count-independent payoffs are
  consent-gated-once, locality of the GDPR rule, and injectable testability.
- Public signatures are unchanged: `trackClientEvent`, `trackServerEvent`, and
  `resolveProCheckoutVariant` keep their shapes, so call sites and the
  cart-complete route are untouched.
- Numbering note: 0006 has a pre-existing two-file collision, and 0010 is
  already earmarked by the in-flight API error-response-seam PR. This ADR
  therefore takes 0011 to avoid a second collision; it does not reconcile the
  0006 one.
