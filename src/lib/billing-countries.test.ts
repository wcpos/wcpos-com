import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildCountryOptions, isBillingCountry } from './billing-countries'

describe('billing countries', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('filters displayable non-country regions from the generated fallback list', () => {
    vi.stubGlobal('Intl', {
      ...Intl,
      supportedValuesOf: () => {
        throw new Error('unsupported')
      },
      DisplayNames: class {
        constructor() {}

        of(code: string) {
          return (
            {
              AU: 'Australia',
              EU: 'European Union',
              XA: 'Pseudo-Accents',
              XB: 'Pseudo-Bidi',
              ZZ: 'Unknown Region',
            } as Record<string, string>
          )[code] ?? code
        }
      } as unknown as typeof Intl.DisplayNames,
    })

    const codes = buildCountryOptions('en', true).map(([code]) => code)

    expect(codes).toContain('au')
    expect(codes).not.toContain('eu')
    expect(codes).not.toContain('xa')
    expect(codes).not.toContain('xb')
    expect(codes).not.toContain('zz')
  })

  it('does not treat macro or unknown regions as billable countries', () => {
    expect(isBillingCountry('au')).toBe(true)
    expect(isBillingCountry('eu')).toBe(false)
    expect(isBillingCountry('zz')).toBe(false)
  })
})
