import { describe, it, expect } from 'vitest'
import { maskLicenseKey, toAdminLicenseRow } from './license-display'
import type { LicenseDetail, LicenseMachine } from '@/types/license'

function makeLicense(overrides: Partial<LicenseDetail> = {}): LicenseDetail {
  return {
    id: 'lic-1',
    key: 'ABCD-EFGH-IJKL-MNOP',
    status: 'ACTIVE',
    expiry: '2099-01-01T00:00:00Z',
    maxMachines: 2,
    machines: [],
    metadata: { customerEmail: 'secret@example.com' },
    policyId: '261cb7e2-6e80-476e-98bd-fe7f406f258d',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const machine: LicenseMachine = {
  id: 'machine-1',
  fingerprint: 'fp-abc123',
  name: 'shop.example.com',
  metadata: { ip: '203.0.113.7' },
  createdAt: '2026-02-01T00:00:00Z',
}

describe('maskLicenseKey', () => {
  it('shows only the last 4 characters', () => {
    expect(maskLicenseKey('ABCD-EFGH-IJKL-MNOP')).toBe('****-****-MNOP')
  })

  it('fully masks short keys', () => {
    expect(maskLicenseKey('ABC')).toBe('****')
  })
})

describe('toAdminLicenseRow', () => {
  it('masks the key so the raw activation credential never crosses the client boundary', () => {
    const row = toAdminLicenseRow(makeLicense(), [machine])

    expect(row.maskedKey).toBe('****-****-MNOP')
    // The serialized row must not contain the raw key in any field.
    expect(JSON.stringify(row)).not.toContain('ABCD-EFGH-IJKL-MNOP')
    expect('key' in row).toBe(false)
  })

  it('strips license and machine metadata', () => {
    const row = toAdminLicenseRow(makeLicense(), [machine])

    expect('metadata' in row).toBe(false)
    const serialized = JSON.stringify(row)
    expect(serialized).not.toContain('secret@example.com')
    expect(serialized).not.toContain('203.0.113.7')
  })

  it('keeps the fields the admin table renders', () => {
    const row = toAdminLicenseRow(makeLicense(), [machine])

    expect(row).toEqual({
      id: 'lic-1',
      maskedKey: '****-****-MNOP',
      status: 'ACTIVE',
      expiry: '2099-01-01T00:00:00Z',
      maxMachines: 2,
      policyId: '261cb7e2-6e80-476e-98bd-fe7f406f258d',
      createdAt: '2026-01-01T00:00:00Z',
      machines: [
        {
          id: 'machine-1',
          fingerprint: 'fp-abc123',
          name: 'shop.example.com',
          createdAt: '2026-02-01T00:00:00Z',
        },
      ],
    })
  })

  it('preserves null machines (failed lookup)', () => {
    expect(toAdminLicenseRow(makeLicense(), null).machines).toBeNull()
  })
})
