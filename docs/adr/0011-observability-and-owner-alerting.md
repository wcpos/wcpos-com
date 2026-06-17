# Owner alerting is severity-routed: Discord for everything, email for fatal

Store-critical events page the owner through two channels chosen by **severity**,
not by event type. The rule is fixed so any new alert site knows where it lands:

- **fatal → Discord + email.** The immediate-attention tier: a customer charged
  but left without a license, a money-at-risk checkout failure
  (`order_pending` / `payment_uncertain`), or download infrastructure that is
  down (missing `DOWNLOAD_TOKEN_SECRET`). Email is the loud "wake me up" channel;
  a missed Discord ping must not be able to hide one of these.
- **error → Discord only.** Operational-but-not-urgent: a routine card decline, a
  download that failed for an entitled customer after retries, a license renewal
  that could not be extended.
- **info → Loki only.** Audit, not alert: a successful purchase (also mirrored to
  Discord as good news), a download served, a token issued.

The mechanism is the existing LogTape fan-out (`src/instrumentation.ts`,
`src/lib/sinks/*`): Console always, plus Loki, Sentry, Discord and an email sink,
each registered only when its env is configured. Discord and email filter by
level internally; Discord rate-limits 30s per category **except** the categories
on `alwaysSendPrefixes` — `wcpos.store.sale` (money-at-risk) and
`wcpos.license.download` (delivery failures) — which must never be throttled
away. The email sink is `fatal`-only with its own per-category throttle so an
incident can't flood the inbox while Discord still receives every event.

Alerting is split across both halves of the system because the events are.
License creation happens in the **wcpos-medusa** `order.placed` subscriber, so the
new-purchase notification and the paid-but-no-license alarm fire there
(`src/lib/owner-alert.ts`, a fire-and-forget Discord-webhook + Resend-email
helper mirroring this repo's sinks). Checkout and download events fire in
**wcpos-com**: payment failures via the browser → `/api/checkout/report-failure`
beacon (the only way money-at-risk browser failures reach the server logger), and
download outcomes from the `/api/account/download*` routes. The same operator
gets the same shape of message from both repos.

Two invariants hold everywhere: **alerting can never break the flow it observes**
(every emit is fire-and-forget and swallows its own errors; the report-failure
endpoint and the download routes always return their normal response), and
**rate limiting fails open** (`src/lib/rate-limit.ts` — a Redis outage returns
success rather than blocking a paying customer). The unauthenticated
report-failure beacon is additionally hardened with a per-IP limit, a 2KB body
cap, and reference sanitisation so it can't be used to inject into the alert
channel.

The chain is verifiable end-to-end without a real purchase via
`/api/debug/alert-test` (guarded by `ALERT_TEST_TOKEN` in production), which emits
a synthetic fatal and so exercises Discord + email together. The pre-launch
verification runbook is in `docs/runbooks/alerting.md`.

This supersedes the ad-hoc state where only money-at-risk checkout failures
reached Discord; new purchases were invisible to the owner, license-creation
failures were logged `CRITICAL` and silently dropped, and download errors could
be rate-limited away before reaching any channel.
