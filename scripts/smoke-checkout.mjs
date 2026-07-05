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

import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const BASE = process.env.CHECKOUT_URL ?? 'https://www.wcpos.com/pro/checkout'
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 20000)

export const redact = (s) =>
  s.replace(/((?:pk|sk)_(?:live|test)_)[A-Za-z0-9]+/g, '$1<redacted>')

/**
 * Pure check over the checkout HTML. Returns confirmed `failures` (a broken key,
 * a secret leak, or the no-methods error) separately from `markerFound`: if the
 * stripePublishableKey marker itself can't be located, the payload shape has
 * likely drifted (Next.js RSC serialization change) and the result is
 * INCONCLUSIVE rather than a confirmed-broken key — a different alert severity.
 */
export function evaluateCheckoutHtml(html) {
  const failures = []
  let markerFound = true

  // 1. The user-facing failure string must never render.
  if (html.includes('No payment methods are configured')) {
    failures.push('checkout rendered "No payment methods are configured"')
  }

  // 2. A secret key must never reach the client.
  if (/\bsk_(live|test)_[A-Za-z0-9]+/.test(html)) {
    failures.push('SECRET KEY LEAK: an sk_ key is present in client HTML')
  }

  // 3. The Stripe publishable key must be a non-empty pk_ value, not null.
  //    It's serialized into the RSC/Flight payload where the surrounding quotes
  //    may be backslash-escaped (`\"pk_live_...\"`) or plain (`"pk_live_..."`),
  //    or the value may be a bare `null`. Accept every shape so a valid key is
  //    never misread as broken.
  const match = html.match(
    /stripePublishableKey\\?"\s*:\s*(?:(null)|\\?"([^"\\]*)\\?")/
  )
  if (!match) {
    markerFound = false
  } else if (match[1] === 'null' || !match[2]) {
    failures.push('stripePublishableKey is empty/null — Stripe (Card) hidden')
  } else if (!match[2].startsWith('pk_')) {
    failures.push(`stripePublishableKey is not a pk_ key: ${redact(match[2])}`)
  }

  return { failures, markerFound }
}

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

  const { failures, markerFound } = evaluateCheckoutHtml(html)

  if (failures.length > 0) {
    console.error(`✗ checkout smoke FAILED for ${BASE}`)
    for (const f of failures) console.error(`  - ${redact(f)}`)
    process.exit(1)
  }

  if (!markerFound) {
    // Distinct from a broken key (exit 1): we couldn't locate the marker, so the
    // serialization may have changed. Alert to verify manually rather than
    // reporting a false "broken key".
    console.error(
      `⚠ checkout smoke INCONCLUSIVE for ${BASE}: stripePublishableKey marker not found (payload serialization may have changed) — verify manually`
    )
    process.exit(3)
  }

  console.log(`✓ checkout smoke passed for ${BASE} (pk_ key present, no leak, no error)`)
}

// Only hit the network when run directly (`node scripts/smoke-checkout.mjs`),
// not when imported by the unit test.
const invokedDirectly =
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))

if (invokedDirectly) {
  main().catch((err) => {
    console.error(`✗ checkout smoke ERROR: ${redact(String(err?.message ?? err))}`)
    process.exit(2)
  })
}
