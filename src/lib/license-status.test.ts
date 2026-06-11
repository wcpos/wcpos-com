import { describe, expect, it } from 'vitest'
import { normalizeLicenseStatus } from './license-status'

describe('normalizeLicenseStatus', () => {
  it('passes canonical statuses through unchanged', () => {
    expect(normalizeLicenseStatus('active')).toBe('active')
    expect(normalizeLicenseStatus('expired')).toBe('expired')
    expect(normalizeLicenseStatus('suspended')).toBe('suspended')
    expect(normalizeLicenseStatus('revoked')).toBe('revoked')
    expect(normalizeLicenseStatus('unknown')).toBe('unknown')
  })

  it('treats in-term Keygen statuses as active', () => {
    // EXPIRING: within days of expiry; INACTIVE: idle ~90 days.
    // Both are paid, in-term licenses and keep full entitlement.
    expect(normalizeLicenseStatus('expiring')).toBe('active')
    expect(normalizeLicenseStatus('inactive')).toBe('active')
  })

  it('maps BANNED to revoked', () => {
    expect(normalizeLicenseStatus('banned')).toBe('revoked')
  })

  it('is case-insensitive (Keygen reports uppercase)', () => {
    expect(normalizeLicenseStatus('ACTIVE')).toBe('active')
    expect(normalizeLicenseStatus('EXPIRING')).toBe('active')
    expect(normalizeLicenseStatus('  Suspended ')).toBe('suspended')
  })

  it('fails closed to unknown for unrecognized statuses', () => {
    expect(normalizeLicenseStatus('invalid')).toBe('unknown')
    expect(normalizeLicenseStatus('')).toBe('unknown')
    expect(normalizeLicenseStatus('something-new')).toBe('unknown')
  })
})
