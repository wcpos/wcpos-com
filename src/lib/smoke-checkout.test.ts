import { describe, expect, it } from 'vitest'

// The production checkout monitor lives as a standalone node script; import its
// pure check (the network/exit wrapper is guarded so importing is side-effect
// free).
import { evaluateCheckoutHtml } from '../../scripts/smoke-checkout.mjs'

describe('evaluateCheckoutHtml', () => {
  it('accepts an escaped Flight-serialized pk_live_ value (the false-fail Codex flagged)', () => {
    const html = String.raw`...\"stripePublishableKey\":\"pk_live_KlgLwN0RGeiWCv3yx6qjv4ef\",\"paypal\":null...`
    expect(evaluateCheckoutHtml(html)).toEqual({
      failures: [],
      markerFound: true,
    })
  })

  it('accepts a plain (unescaped) pk_live_ value', () => {
    const html = '{"stripePublishableKey":"pk_live_abc123","paypal":null}'
    expect(evaluateCheckoutHtml(html)).toEqual({
      failures: [],
      markerFound: true,
    })
  })

  it('flags a null key (the outage state)', () => {
    const html = String.raw`\"stripePublishableKey\":null`
    const { failures, markerFound } = evaluateCheckoutHtml(html)
    expect(markerFound).toBe(true)
    expect(failures).toHaveLength(1)
    expect(failures[0]).toMatch(/empty\/null/)
  })

  it('flags an escaped empty-string key', () => {
    const html = String.raw`\"stripePublishableKey\":\"\"`
    const { failures } = evaluateCheckoutHtml(html)
    expect(failures[0]).toMatch(/empty\/null/)
  })

  it('flags a value that is not a pk_ key', () => {
    const html = String.raw`\"stripePublishableKey\":\"undefined\"`
    const { failures } = evaluateCheckoutHtml(html)
    expect(failures).toHaveLength(1)
    expect(failures[0]).toMatch(/not a pk_ key/)
  })

  it('does not flag a pk_test_ value — the live-env guard, not the monitor, rejects test keys', () => {
    const html = String.raw`\"stripePublishableKey\":\"pk_test_abc123\"`
    // pk_test_ satisfies the pk_ prefix, so the monitor treats it as present;
    // store-environment.ts is what refuses a test key on the live host.
    expect(evaluateCheckoutHtml(html).failures).toHaveLength(0)
  })

  it('flags a leaked secret key', () => {
    const html = String.raw`\"stripePublishableKey\":\"pk_live_ok0000\" ... sk_live_supersecret999`
    const { failures } = evaluateCheckoutHtml(html)
    expect(failures.some((f) => /SECRET KEY LEAK/.test(f))).toBe(true)
  })

  it('flags the no-methods error string', () => {
    const html = 'No payment methods are configured. Please contact support.'
    const { failures } = evaluateCheckoutHtml(html)
    expect(failures.some((f) => /No payment methods are configured/.test(f))).toBe(
      true
    )
  })

  it('reports markerFound=false (inconclusive) when the key is absent, distinct from a broken key', () => {
    const html = '<html>a totally different payload</html>'
    expect(evaluateCheckoutHtml(html)).toEqual({
      failures: [],
      markerFound: false,
    })
  })
})
