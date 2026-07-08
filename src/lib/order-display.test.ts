import { describe, it, expect } from 'vitest'
import { formatOrderAmount, maskLicenseKey } from './order-display'

describe('formatOrderAmount', () => {
  it('formats Medusa order totals as display amounts (no cents conversion)', () => {
    expect(formatOrderAmount(129, 'usd')).toBe('$129.00')
  })

  it('formats decimal amounts correctly', () => {
    expect(formatOrderAmount(129.5, 'usd')).toBe('$129.50')
  })

  it('falls back safely when a malformed locale reaches amount display', () => {
    expect(formatOrderAmount(129, 'usd', 'not_a_locale')).toBe('$129.00')
  })
})

describe('maskLicenseKey', () => {
  it('masks all but the final four characters in the e2e contract format', () => {
    expect(maskLicenseKey('E2EA-CTIV-EKEY-1234')).toBe('****-****-1234')
  })

  it('fully masks short keys', () => {
    expect(maskLicenseKey('1234')).toBe('****')
    expect(maskLicenseKey('ab')).toBe('****')
  })
})
