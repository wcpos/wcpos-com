# Runbook: store alerting

How the owner alerts work, what each one means, and how to verify the whole
chain before launch. See [ADR 0011](../adr/0011-observability-and-owner-alerting.md)
for the design.

## Channels

| Tier | Channel | Source |
|---|---|---|
| **fatal** | Discord **+ email** | money-at-risk, paid-but-no-license, download infra down |
| **error** | Discord | routine decline, download delivery failed, renewal failed |
| **info** | Loki (purchase also → Discord) | successful purchase, download served, token issued |

## Alerts and first response

| Alert (title) | Origin | Means | First response |
|---|---|---|---|
| 🔴 **PAID BUT NO LICENSE — manual action required** | wcpos-medusa `order.placed` | Customer charged, order placed, **no license created**. | Look up the order id → check Keygen for the customer email → create/repair the license manually → email the key. Check why Keygen failed (token/policy/outage). |
| 🔴 **License creation/renewal failed** | wcpos-medusa | A specific Keygen create/renew call failed after retries. | Same as above for that order; if repeated, Keygen is degraded — check `KEYGEN_API_TOKEN`/policy ids/host. |
| 🔴 **License email delivery failed** | wcpos-medusa | License exists but the confirmation email didn't send. | Re-send the key to the customer; check Resend status / `RESEND_API_KEY`. |
| 🔴 **Checkout failure (money at risk)** | wcpos-com beacon | A customer's charge may have completed without an order (`order_pending`/`payment_uncertain`). | Find the order/payment by the `WCPOS-…` reference in Medusa/Stripe → finish or refund. The customer was told **not** to pay again. |
| 🔴 **Download token secret not configured** | wcpos-com download routes | `DOWNLOAD_TOKEN_SECRET` is unset — downloads are degraded. | Set `DOWNLOAD_TOKEN_SECRET` in Vercel and redeploy. |
| 🟠 **Checkout payment failure** | wcpos-com beacon | A routine decline/error (`payment_failed`). | Usually no action; watch for spikes (gateway issue). |
| 🟠 **Failed to fetch release asset** | wcpos-com download | An entitled customer couldn't download after retries (GitHub/asset issue). | Check GitHub releases / `GITHUB_*` app token; the customer may need a retry. |
| 🟢 **New license purchase** | wcpos-medusa | A sale completed. | None — informational. |

Audit trail (no alert) lives in **Loki**: `wcpos.license.download` info lines record
who downloaded what, when, from which IP/user-agent; denials record customer + IP + reason.

## Pre-launch verification drill

Run **after** the PRs are merged and deployed and the env below is set.

**1. Prove the alert chain (no purchase needed).** Hit the test endpoint in
production with the configured token — expect a Discord message **and** an email:

```
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "x-alert-test-token: $ALERT_TEST_TOKEN" \
  https://wcpos.com/api/debug/alert-test
```

**2. One real purchase, end to end.** Buy Pro with a live/test card, then confirm:
- Order appears in Medusa with `payment_status: captured` and `metadata.licenses` populated.
- License exists in Keygen for the buyer email.
- Buyer receives the license-key email.
- **🟢 New license purchase** lands in Discord.
- Download works from `/account/downloads` and a `Download served` info line appears in Loki.

**3. Force a failure (staging).** Point Keygen at a bad token for one order and
confirm **🔴 PAID BUT NO LICENSE** fires to Discord **and** email. Restore the token.

## Required env

**wcpos-com (Vercel):** `DISCORD_WEBHOOK_URL`, `RESEND_API_KEY`, `ALERT_EMAIL_TO`,
`ALERT_EMAIL_FROM`, `ALERT_TEST_TOKEN`, `DOWNLOAD_TOKEN_SECRET`, `LOKI_URL`
(+`LOKI_API_KEY`), `SENTRY_DSN`, `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`,
`GITHUB_INSTALLATION_ID`, `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`.

**wcpos-medusa (Coolify):** `DISCORD_WEBHOOK_URL`, `OWNER_ALERT_EMAIL`,
`RESEND_API_KEY`, `RESEND_FROM`.

Any unset alerting var degrades to a silent no-op — safe, but you won't be paged.
Confirm with the drill above.
