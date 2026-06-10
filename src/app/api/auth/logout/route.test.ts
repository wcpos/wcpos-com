import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockLogout = vi.fn()

vi.mock('@/lib/medusa-auth', () => ({
  logout: (...args: unknown[]) => mockLogout(...args),
}))

import { GET, POST } from './route'

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

describe('GET /api/auth/logout (invalid-token loop breaker)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogout.mockResolvedValue(undefined)
  })

  function get(url: string) {
    return GET(new NextRequest(url))
  }

  it('clears the session and redirects to the requested relative target', async () => {
    const response = await get(
      'http://localhost:3000/api/auth/logout?to=%2Ffr%2Flogin'
    )

    expect(mockLogout).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/fr/login'
    )
  })

  it('defaults to /login without a target', async () => {
    const response = await get('http://localhost:3000/api/auth/logout')
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login'
    )
  })

  it('rejects absolute and protocol-relative targets', async () => {
    for (const target of [
      'https%3A%2F%2Fevil.com',
      '%2F%2Fevil.com',
      '%2F%5Cevil.com',
      'javascript%3Aalert(1)',
    ]) {
      const response = await get(
        `http://localhost:3000/api/auth/logout?to=${target}`
      )
      expect(response.headers.get('location')).toBe(
        'http://localhost:3000/login'
      )
    }
  })
})
