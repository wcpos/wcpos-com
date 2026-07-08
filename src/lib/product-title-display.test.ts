import { describe, expect, it } from 'vitest'
import { knownProductTitleKey, localizeKnownProductTitle } from './product-title-display'

const messages = {
  yearly: 'WCPOS Pro annuel',
  lifetime: 'WCPOS Pro à vie',
}

describe('known product title display', () => {
  it('detects known WCPOS Pro title variants', () => {
    expect(knownProductTitleKey('WCPOS Pro Yearly')).toBe('yearly')
    expect(knownProductTitleKey('WCPOS Pro (Yearly)')).toBe('yearly')
    expect(knownProductTitleKey('WCPOS Pro - Lifetime')).toBe('lifetime')
    expect(knownProductTitleKey('WCPOS Pro Lifetime')).toBe('lifetime')
  })

  it('localizes known titles and preserves unknown catalog titles', () => {
    expect(localizeKnownProductTitle('WCPOS Pro Yearly', messages)).toBe(
      'WCPOS Pro annuel'
    )
    expect(localizeKnownProductTitle('WCPOS Pro Lifetime', messages)).toBe(
      'WCPOS Pro à vie'
    )
    expect(localizeKnownProductTitle('Custom Product', messages)).toBe(
      'Custom Product'
    )
  })
})
