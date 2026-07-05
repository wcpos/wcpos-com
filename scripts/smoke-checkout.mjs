#!/usr/bin/env node
// Production checkout smoke monitor.
//
// Guards the recurring "No payment methods are configured" outage: fetches the
// live checkout and asserts it never serves an empty Stripe publishable key,
// never leaks a secret key, and never renders the no-methods error. Exit code
// is non-zero on any failure so it can drive a cron/uptime monitor or CI gate.
//
//   node scripts/smoke-checkout.mjs            # checks https://www.wcpos.com
//   CHECKOUT_URL=https://beta.wcpos.com/pro/checkout node scripts/smoke-checkout.mjs
//
// All keys are redacted in output — safe to run in shared logs.

const BASE = process.env.CHECKOUT_URL ?? 'https://www.wcpos.com/pro/checkout'
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 20000)

const redact = (s) =>
  s.replace(/((?:pk|sk)_(?:live|test)_)[A-Za-z0-9]+/g, '$1<redacted>')

async function main() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let html
  try {
    const res = await fetch(BASE, {
      redirect: 'follow',
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${BASE}`)
    html = await res.text()
  } finally {
    clearTimeout(timer)
  }

  const failures = []
  const alerts = []

  // 1. The user-facing failure string must never render.
  if (html.includes('No payment methods are configured')) {
    failures.push('checkout rendered "No payment methods are configured"')
  }

  // 2. A secret key must never reach the client.
  if (/\bsk_(live|test)_[A-Za-z0-9]+/.test(html)) {
    failures.push('SECRET KEY LEAK: an sk_ key is present in client HTML')
  }

  // 3. The Stripe publishable key must be a non-empty pk_ value, not null.
  const match = html.match(
    /stripePublishableKey\\?"\s*:\s*(?:"([^"]*)"|\\"([^\\"]*)\\"|([^",}\s]*))/
  )
  if (!match) {
    alerts.push('stripePublishableKey marker not found in checkout payload')
  } else {
    const value = match[1] ?? match[2] ?? match[3]
    if (!value || value === 'null') {
      failures.push('stripePublishableKey is empty/null — Stripe (Card) hidden')
    } else if (!value.startsWith('pk_')) {
      failures.push(`stripePublishableKey is not a pk_ key: ${redact(value)}`)
    }
  }

  if (failures.length > 0) {
    console.error(`✗ checkout smoke FAILED for ${BASE}`)
    for (const f of failures) console.error(`  - ${redact(f)}`)
    process.exit(1)
  }

  if (alerts.length > 0) {
    console.error(`✗ checkout smoke INCONCLUSIVE for ${BASE}`)
    for (const alert of alerts) console.error(`  - ${redact(alert)}`)
    process.exit(3)
  }

  console.log(`✓ checkout smoke passed for ${BASE} (pk_ key present, no leak, no error)`)
}

main().catch((err) => {
  console.error(`✗ checkout smoke ERROR: ${redact(String(err?.message ?? err))}`)
  process.exit(2)
})
