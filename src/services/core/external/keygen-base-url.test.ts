import { describe, expect, it } from 'vitest'

import { getKeygenBaseUrl } from './keygen-base-url'

describe('getKeygenBaseUrl', () => {
  it('allows the production Keygen host', () => {
    expect(getKeygenBaseUrl('license.wcpos.com', 'production')).toBe(
      'https://license.wcpos.com'
    )
  })

  it('rejects hosts outside the allow-list', () => {
    expect(() => getKeygenBaseUrl('169.254.169.254', 'production')).toThrow(
      /trusted Keygen host/i
    )
  })

  it('rejects host strings that include a path', () => {
    expect(() =>
      getKeygenBaseUrl('license.wcpos.com/internal-metadata', 'production')
    ).toThrow(/hostname only/i)
  })

  it('allows localhost with a port outside production', () => {
    expect(getKeygenBaseUrl('localhost:3000', 'test')).toBe(
      'https://localhost:3000'
    )
  })
})
