import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockLogout = vi.fn()

vi.mock('@/lib/medusa-auth', () => ({
  logout: (...args: unknown[]) => mockLogout(...args),
}))

import { POST } from './route'

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogout.mockResolvedValue(undefined)
  })

  it('clears the session and redirects to /login with 303', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
      })
    )

    expect(mockLogout).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login'
    )
  })

  it('resolves the redirect against the request origin', async () => {
    const response = await POST(
      new NextRequest('https://beta.wcpos.com/api/auth/logout', {
        method: 'POST',
      })
    )

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe(
      'https://beta.wcpos.com/login'
    )
  })
})
