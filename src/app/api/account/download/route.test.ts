import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()

vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
}))

import { GET } from './route'

describe('GET /api/account/download', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetCustomer.mockResolvedValueOnce(null)

    const response = await GET(
      new NextRequest('http://localhost/api/account/download?token=test')
    )

    expect(response.status).toBe(401)
  })
})
