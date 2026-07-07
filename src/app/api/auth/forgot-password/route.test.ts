import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockRequestPasswordReset = vi.fn()
const { infoMock, errorMock, consumeMock } = vi.hoisted(() => ({
  infoMock: vi.fn(),
  errorMock: vi.fn(),
  consumeMock: vi.fn(),
}))

vi.mock('@/lib/medusa-auth', () => ({
  requestPasswordReset: (...args: unknown[]) =>
    mockRequestPasswordReset(...args),
}))
vi.mock('@/lib/logger', () => ({
  authLogger: { info: infoMock, error: errorMock },
}))
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: () => ({ consume: consumeMock }),
  clientIp: () => '203.0.113.7',
}))

import { POST } from './route'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    consumeMock.mockResolvedValue({ success: true, remaining: 4 })
  })

  it('returns 400 when email is missing', async () => {
    const response = await POST(makeRequest({}))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.errorCode).toBe('email_required')
    expect(mockRequestPasswordReset).not.toHaveBeenCalled()
  })

  it('requests the reset and returns success', async () => {
    mockRequestPasswordReset.mockResolvedValueOnce(undefined)

    const response = await POST(makeRequest({ email: 'user@example.com' }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ success: true })
    expect(mockRequestPasswordReset).toHaveBeenCalledWith('user@example.com')
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('trims whitespace from the email', async () => {
    mockRequestPasswordReset.mockResolvedValueOnce(undefined)

    await POST(makeRequest({ email: '  user@example.com  ' }))

    expect(mockRequestPasswordReset).toHaveBeenCalledWith('user@example.com')
  })

  it('returns 429 when the rate limit is exceeded', async () => {
    consumeMock.mockResolvedValueOnce({ success: false, remaining: 0 })

    const response = await POST(makeRequest({ email: 'user@example.com' }))
    const json = await response.json()

    expect(response.status).toBe(429)
    expect(json.errorCode).toBe('rate_limited')
    expect(mockRequestPasswordReset).not.toHaveBeenCalled()
  })

  it('returns a generic 500 and logs at error when Medusa fails', async () => {
    mockRequestPasswordReset.mockRejectedValueOnce(new Error('fetch failed'))

    const response = await POST(makeRequest({ email: 'user@example.com' }))
    const json = await response.json()

    // The Medusa error message is not forwarded — nothing here should hint at
    // whether the account exists.
    expect(response.status).toBe(500)
    expect(json.errorCode).toBe('reset_request_failed')
    expect(errorMock).toHaveBeenCalledTimes(1)
  })

  it('returns 400 when the request body is not valid JSON', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: 'not-json',
      })
    )
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.errorCode).toBe('email_required')
    expect(mockRequestPasswordReset).not.toHaveBeenCalled()
  })
})
