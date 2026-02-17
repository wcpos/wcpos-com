import { describe, expect, it } from 'vitest'
import { createDownloadToken, verifyDownloadToken } from './download-token'

describe('download token helpers', () => {
  it('creates and verifies a token', () => {
    const token = createDownloadToken(
      {
        customerId: 'cust_1',
        version: '1.9.0',
        expiresAt: Date.now() + 60_000,
      },
      'secret'
    )

    const payload = verifyDownloadToken(token, 'secret')

    expect(payload?.customerId).toBe('cust_1')
    expect(payload?.version).toBe('1.9.0')
  })

  it('rejects expired tokens', () => {
    const token = createDownloadToken(
      {
        customerId: 'cust_1',
        version: '1.9.0',
        expiresAt: Date.now() - 1,
      },
      'secret'
    )

    expect(verifyDownloadToken(token, 'secret')).toBeNull()
  })
})
