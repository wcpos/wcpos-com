import { describe, expect, it } from 'vitest'
import {
  licenceScopeFromValidation,
  resolveEntitledReleases,
  selectEntitledRelease,
} from './release-delivery'

function release(version: string, publishedAt: string) {
  return { version, publishedAt, name: `WCPOS Pro ${version}` }
}

// Newest-first, mirroring getProPluginReleases' sort.
const RELEASES = [
  release('3.0.0', '2026-06-01T00:00:00Z'),
  release('2.0.0', '2025-06-01T00:00:00Z'),
  release('1.0.0', '2024-06-01T00:00:00Z'),
]

const NOW = new Date('2026-06-17T00:00:00Z').getTime()

const ACTIVE_SCOPE = {
  kind: 'licence' as const,
  licence: { status: 'active' as const, expiry: null },
}

describe('licenceScopeFromValidation', () => {
  it('carries the entitlement licence through', () => {
    expect(
      licenceScopeFromValidation({
        entitlement: { status: 'active', expiry: null },
      })
    ).toEqual({
      kind: 'licence',
      licence: { status: 'active', expiry: null },
    })
  })

  it('falls back to an unknown licence when entitlement is absent', () => {
    expect(licenceScopeFromValidation({})).toEqual({
      kind: 'licence',
      licence: { status: 'unknown', expiry: null },
    })
  })
})

describe('resolveEntitledReleases', () => {
  it('annotates each release with the scope verdict', () => {
    const result = resolveEntitledReleases(RELEASES, ACTIVE_SCOPE, NOW)
    expect(result.map((r) => r.allowed)).toEqual([true, true, true])
  })
})

describe('selectEntitledRelease', () => {
  it('selects a concrete entitled version', () => {
    expect(selectEntitledRelease(RELEASES, '2.0.0', ACTIVE_SCOPE, NOW)).toEqual({
      ok: true,
      release: RELEASES[1],
    })
  })

  it('treats a leading-v version as the same release', () => {
    expect(selectEntitledRelease(RELEASES, 'v2.0.0', ACTIVE_SCOPE, NOW)).toEqual(
      { ok: true, release: RELEASES[1] }
    )
  })

  it('selects latest as the newest entitled release', () => {
    expect(selectEntitledRelease(RELEASES, 'latest', ACTIVE_SCOPE, NOW)).toEqual(
      { ok: true, release: RELEASES[0] }
    )
  })

  it('returns not_found for a version that does not exist', () => {
    expect(selectEntitledRelease(RELEASES, '9.9.9', ACTIVE_SCOPE, NOW)).toEqual({
      ok: false,
      reason: 'not_found',
    })
  })

  it('returns not_entitled for an existing version the scope cannot download', () => {
    const expired = {
      kind: 'licence' as const,
      licence: { status: 'expired' as const, expiry: '2024-12-01T00:00:00Z' },
    }
    expect(selectEntitledRelease(RELEASES, '3.0.0', expired, NOW)).toEqual({
      ok: false,
      reason: 'not_entitled',
    })
  })

  it('per-licence and account scope disagree for active-A + expired-B (ADR-0006)', () => {
    const activeA = { status: 'active' as const, expiry: '2027-01-01T00:00:00Z' }
    const expiredB = {
      status: 'expired' as const,
      expiry: '2024-12-01T00:00:00Z',
    }

    // The expired B licence on its own cannot reach the newest build...
    expect(
      selectEntitledRelease(
        RELEASES,
        '3.0.0',
        { kind: 'licence', licence: expiredB },
        NOW
      )
    ).toEqual({ ok: false, reason: 'not_entitled' })

    // ...but the account union (which holds active A) can.
    expect(
      selectEntitledRelease(
        RELEASES,
        '3.0.0',
        { kind: 'account', licences: [activeA, expiredB] },
        NOW
      )
    ).toEqual({ ok: true, release: RELEASES[0] })
  })
})
