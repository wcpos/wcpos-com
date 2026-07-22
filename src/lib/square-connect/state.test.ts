import { describe, expect, it } from 'vitest'
import { decodeState, encodeState, isAcceptableCallback } from './state'

const SECRET = 'test-secret-value-at-least-32-chars-long'
const NOW = 1_800_000_000_000

function state(overrides: Partial<Parameters<typeof encodeState>[0]> = {}) {
  return {
    callbackUrl: 'https://shop.example/wp-admin/admin-post.php',
    environment: 'production' as const,
    issuedAt: NOW,
    ...overrides,
  }
}

describe('connect state', () => {
  it('round-trips a signed state', () => {
    const decoded = decodeState(encodeState(state(), SECRET), SECRET, NOW)

    expect(decoded?.callbackUrl).toBe('https://shop.example/wp-admin/admin-post.php')
    expect(decoded?.environment).toBe('production')
  })

  it('rejects a state signed with a different secret', () => {
    const forged = encodeState(state(), 'attacker-secret-value-at-least-32-chars')

    expect(decodeState(forged, SECRET, NOW)).toBeNull()
  })

  it('rejects a tampered payload', () => {
    const encoded = encodeState(state(), SECRET)
    const [, signature] = encoded.split('.')
    const swapped = Buffer.from(
      JSON.stringify(state({ callbackUrl: 'https://attacker.example/steal' })),
      'utf8'
    ).toString('base64url')

    // Swapping the destination while keeping the original signature is the
    // attack this signing exists to stop.
    expect(decodeState(`${swapped}.${signature}`, SECRET, NOW)).toBeNull()
  })

  it('rejects a malformed state', () => {
    expect(decodeState('not-a-state', SECRET, NOW)).toBeNull()
    expect(decodeState('a.b.c', SECRET, NOW)).toBeNull()
    expect(decodeState('', SECRET, NOW)).toBeNull()
  })

  it('expires an old state', () => {
    const encoded = encodeState(state(), SECRET)

    expect(decodeState(encoded, SECRET, NOW + 16 * 60 * 1000)).toBeNull()
  })

  it('rejects a state issued in the future', () => {
    const encoded = encodeState(state({ issuedAt: NOW + 10 * 60 * 1000 }), SECRET)

    expect(decodeState(encoded, SECRET, NOW)).toBeNull()
  })

  it('rejects an unknown environment', () => {
    const payload = Buffer.from(
      JSON.stringify({ callbackUrl: 'https://shop.example/x', environment: 'staging', issuedAt: NOW }),
      'utf8'
    ).toString('base64url')
    const encoded = encodeState(state(), SECRET)
    const [, signature] = encoded.split('.')

    expect(decodeState(`${payload}.${signature}`, SECRET, NOW)).toBeNull()
  })
})

describe('callback url acceptance', () => {
  it('accepts an ordinary https site', () => {
    expect(isAcceptableCallback('https://shop.example/wp-admin/admin-post.php?action=x')).toBe(true)
  })

  it.each([
    ['http://shop.example/x', 'plain http'],
    ['https://user:pass@shop.example/x', 'embedded credentials'],
    ['https://shop.example/x#fragment', 'a fragment'],
    ['https://shop.example:8443/x', 'a non-standard port'],
    ['https://localhost/x', 'localhost'],
    ['https://shop.local/x', 'a .local name'],
    ['https://127.0.0.1/x', 'an IPv4 literal'],
    ['https://192.168.1.10/x', 'a private IPv4 literal'],
    ['https://[::1]/x', 'an IPv6 literal'],
    ['https://intranet/x', 'a bare hostname'],
    ['not-a-url', 'a malformed URL'],
  ])('rejects %s (%s)', (candidate) => {
    expect(isAcceptableCallback(candidate)).toBe(false)
  })
})
