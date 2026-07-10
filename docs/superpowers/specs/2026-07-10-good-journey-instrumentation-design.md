# Good Journey Instrumentation Design

## Context

The first observed production Pro sale proved that PostHog can stitch the
anonymous website and docs journey to `signup_completed` and
`checkout_completed` as one person. It also exposed five gaps:

- server events do not carry the browser `$session_id`;
- the payment provider and payment lifecycle are invisible;
- a served Pro download is present only in operational logs;
- the header Pro CTA has no placement property; and
- conversion events do not carry the selected site locale.

This change should make acquisition-to-download analysis reliable without
capturing customer, order-content, or payment PII.

## Goals

1. Keep browser and server funnel events in the same PostHog session.
2. Measure checkout attempts, safe failure categories, completions, and provider
   performance.
3. Measure the first post-purchase product download.
4. Attribute Pro CTA clicks to their placement.
5. Make locale available directly on conversion events.

## Non-goals

- Session replay or autocapture.
- Raw gateway errors, decline codes, card data, addresses, names, email, IP, or
  order contents in PostHog.
- Replacing Loki/Sentry/Discord operational checkout reporting.
- Instrumenting plugin activation or license activation in another repository.

## Architecture

### Browser analytics context and cart handoff

Add a small analytics-context helper beside the existing browser analytics
service. After consent and PostHog initialization, it returns:

```ts
{
  sessionId: posthog.get_session_id(),
  locale,
}
```

The registration client adds this context to its existing API request body.
Cart creation persists validated business context plus the non-PII rollout
marker `wcpos_analytics_protocol: 'attempt_v1'`; it deliberately does not mark
the cart for analytics completion. Immediately before a real payment
attempt, WCPOS re-reads consent and the server identity, then writes the current
session, locale, experiment, variant, and `completion_owner: 'medusa_v1'` to
namespaced cart metadata. Medusa transfers that metadata to the created order,
so every completion path receives the same attempt-time attribution without a
stale cart-creation grant.

Missing or malformed context is ignored; it must never block registration or
payment. API routes accept only bounded strings and validate locale against the
application's supported locale list.

The server continues to own `distinct_id` through the existing consent-gated
cookie. Client input never chooses the PostHog person.

### Checkout lifecycle

Use normalized provider values:

- `stripe`
- `paypal`
- `btcpay`
- `unknown`

The browser captures `checkout_payment_started` immediately before invoking a
provider. Properties are `payment_provider`, `plan`, `experiment`, `variant`,
and `locale`. The attended account renewal checkout uses the same contract with
`experiment: 'license_renewal'`, so recurring revenue is not left outside the
provider/session funnel. This is bounded analytics context, not an authoritative
renewal marker; fulfillment continues to derive renewal from the authenticated
customer's existing licence.

Before each real provider attempt, the browser also awaits a same-origin cart
attribution refresh. The server re-reads the current consent and server cookie:
granted consent replaces the cart envelope with the current session; withdrawn
or missing consent removes it. This defines consent at payment initiation for
the resulting transaction, including a later asynchronous BTCPay completion.
The refresh is operationally best-effort. A timeout, network error, or non-OK
response does not claim a tracked start and cannot create the initial completion
marker; the provider still proceeds. The narrow exception is an explicit denial
that is not positively acknowledged as cleared: payment is stopped rather than
risk a late, previous, or in-flight request leaving stale consent on the cart.
Consent is re-read after the refresh so cross-tab withdrawal during the request
is honored; undecided/granted visitors still proceed through general analytics
outages. PayPal must enter its SDK
synchronously from the click to preserve transient popup activation; its
deferred `createOrder` callback awaits the refresh before the provider order is
created.

The existing browser failure boundary captures `checkout_payment_failed` once
per surfaced failure with `payment_provider` and the stable, customer-safe
failure `kind`. It must not send the support reference, exception message,
gateway code, decline code, payment intent, order, or cart identifier.

`checkout_completed` moves to Medusa's existing `order.placed` subscriber. This
is the only completion point shared by Stripe, PayPal, and asynchronous BTCPay;
the current WCPOS route sees only Stripe and PayPal, so keeping capture there
would permanently undercount Bitcoin purchases.

The subscriber captures only orders carrying the `medusa_v1` ownership marker,
then derives `payment_provider` from the order payment collection, never from
browser input. It builds the plan from the validated Pro product, uses the order
total/currency, and reads attribution from the namespaced order metadata. A
deterministic event UUID derived from the order ID makes repeated `order.placed`
deliveries idempotent in PostHog. If the order has no consented analytics
distinct ID, it does not capture the event.

Once the Medusa subscriber is deployed, the WCPOS cart-completion route emits
`checkout_completed` only for legacy carts without the protocol marker. New
protocol carts never enter that fallback: a successfully attributed attempt is
owned exclusively by Medusa, while an unacknowledged attempt intentionally has
no completion event. This prevents a late refresh from racing route-local and
subscriber capture for the same order.

Operational failure reporting remains unchanged and independent of analytics
consent.

### Registration

`signup_completed` adds the validated `$session_id` and locale supplied with the
registration request. Existing distinct-ID fallback and consent behavior remain
unchanged.

### Pro download

After the download route has fetched the entitled artifact successfully, it
captures server-side `pro_downloaded` with:

- `version`
- `channel: 'account'`
- validated locale when available

The event uses the consent cookie's anonymous distinct ID. Unlike necessary
order processing, analytics must not create a customer-keyed event when the
visitor declined or did not grant analytics consent. It does not include
filename, IP, user agent, token, or entitlement details. Operational audit
logging remains unchanged.

### CTA placement

The desktop and mobile header Pro links keep the existing `click_pro_cta` event
and add `location: 'desktop_header'` or `location: 'mobile_menu'`. Existing
placement values elsewhere remain unchanged.

## Event contract

| Event | Required new properties | Source |
| --- | --- | --- |
| `click_pro_cta` | `location` for header links | Browser |
| `checkout_payment_started` | `payment_provider`, `plan`, `experiment`, `variant`, `locale` | Browser |
| `checkout_payment_failed` | `payment_provider`, `failure_kind`, `plan`, `experiment`, `variant`, `locale` | Browser |
| `signup_completed` | `$session_id`, `locale` when valid | Server |
| `checkout_completed` | `$session_id`, `locale`, `payment_provider` | Server |
| `pro_downloaded` | `version`, `channel`, optional `locale` | Server |

## Repository responsibilities and rollout

### `wcpos-com`

- Gather and validate browser analytics context.
- Persist consented context in cart metadata.
- Capture checkout starts/failures, signup, download, and CTA placement.
- Retain route-local completion capture only as an unmarked legacy-cart
  fallback after the Medusa capture path is available.

### `wcpos-medusa`

- Capture idempotent `checkout_completed` from `order.placed` for every payment
  provider.
- Resolve provider, plan, revenue, currency, and safe attribution from the
  completed order.

Rollout is ordered: deploy the Medusa completion capture first, then deploy the
WCPOS change that marks new carts as Medusa-owned and makes route-local capture
a legacy fallback. The marker is the handoff boundary: old carts continue
through the existing route capture, while only newly marked carts use the
subscriber. This avoids both a duplicate window and a missing-event window. The
companion PRs must state this deployment order explicitly.

## Failure handling and privacy

- Analytics calls remain non-blocking and non-throwing to product flows.
- Missing consent means no new browser or server analytics capture.
- Missing SDK/config/context means the event is skipped or sent without optional
  context; the customer action continues.
- Provider normalization is an allowlist. Unknown Medusa provider IDs become
  `unknown`, never a raw string.
- Failure analytics use the stable internal taxonomy only; operational details
  stay in Loki/Sentry/Discord.

## Testing

Use test-first changes around existing seams:

1. Analytics-context tests for consent/SDK availability and session extraction.
2. Registration and cart route tests for valid, missing, declined, and malformed
   context.
3. Medusa subscriber tests for Stripe, PayPal, BTCPay, unknown providers,
   missing consent metadata, and idempotent event UUIDs.
4. Checkout component tests proving one started event and one safe failed event
   per attempt, with no sensitive properties.
5. Download route tests proving capture occurs only after successful artifact
   retrieval.
6. Header tests for distinct desktop/mobile placement values.

Run targeted tests during TDD, then the full test suite, lint, type-check/build,
and payment/security review gates before opening the PR.
