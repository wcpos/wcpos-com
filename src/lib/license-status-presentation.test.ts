import { describe, expect, it } from 'vitest'
import { presentLicenseStatus } from './license-status-presentation'

describe('presentLicenseStatus', () => {
  it('presents active licenses as positive with the active label key', () => {
    expect(presentLicenseStatus('active')).toEqual({
      labelKey: 'active',
      tone: 'positive',
    })
  })

  it('presents naturally expired licenses as caution', () => {
    expect(presentLicenseStatus('expired')).toEqual({
      labelKey: 'expired',
      tone: 'caution',
    })
  })

  it('presents suspended and revoked licenses as critical', () => {
    expect(presentLicenseStatus('suspended')).toEqual({
      labelKey: 'suspended',
      tone: 'critical',
    })
    expect(presentLicenseStatus('revoked')).toEqual({
      labelKey: 'revoked',
      tone: 'critical',
    })
  })

  it('presents unknown licenses as neutral with an unverifiable tooltip key', () => {
    expect(presentLicenseStatus('unknown')).toEqual({
      labelKey: 'unknown',
      tone: 'neutral',
      titleKey: 'unknownStatusTooltip',
    })
  })
})
