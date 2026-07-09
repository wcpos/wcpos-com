import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetCustomer = vi.fn()
const mockRequestPasswordReset = vi.fn()
const mockEnsureEmailpass = vi.fn()
const { errorMock, assertViewOnly, sameOrigin, consume } = vi.hoisted(() => ({
  errorMock: vi.fn(),
  assertViewOnly: vi.fn(),
  sameOrigin: vi.fn(() => true),
  consume: vi.fn(async () => ({ success: true })),
}))

vi.mock('@/lib/impersonation', () => ({
  assertViewOnly,
  ViewOnlyError: class ViewOnlyError extends Error {},
}))
vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
  requestPasswordReset: (...args: unknown[]) =>
    mockRequestPasswordReset(...args),
}))
vi.mock('@/lib/auth-methods', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth-methods')>(
    '@/lib/auth-methods'
  )
  return {
    AuthMethodError: actual.AuthMethodError,
    ensureEmailpassAuthMethod: (...args: unknown[]) =>
      mockEnsureEmailpass(...args),
  }
})
vi.mock('@/lib/logger', () => ({
  authLogger: { error: errorMock },
}))
vi.mock('@/lib/api/same-origin', () => ({
  isSameOriginRequest: sameOrigin,
}))
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: () => ({ consume }),
  clientIp: () => '127.0.0.1',
}))

import { AuthMethodError } from '@/lib/auth-methods'
import { POST } from './route'

function makeRequest() {
  return new Request('http://localhost:3000/api/account/password', {
    method: 'POST',
  })
}

describe('POST /api/account/password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sameOrigin.mockReturnValue(true)
    consume.mockResolvedValue({ success: true })
    assertViewOnly.mockResolvedValue(undefined)
    mockGetCustomer.mockResolvedValue({
      id: 'cus_1',
      email: 'ada@example.com',
    })
  })

  it('rejects cross-origin requests', async () => {
    sameOrigin.mockReturnValue(false)
    const response = await POST(makeRequest())
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ errorCode: 'invalid_origin' })
  })

  it('rate limits', async () => {
    consume.mockResolvedValueOnce({ success: false })
    const response = await POST(makeRequest())
    expect(response.status).toBe(429)
  })

  it('returns 403 read_only_inspection while impersonating', async () => {
    const { ViewOnlyError } = await import('@/lib/impersonation')
    assertViewOnly.mockRejectedValueOnce(new ViewOnlyError())
    const response = await POST(makeRequest())
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ errorCode: 'read_only_inspection' })
    expect(mockRequestPasswordReset).not.toHaveBeenCalled()
  })

  it('returns 401 when signed out', async () => {
    mockGetCustomer.mockResolvedValueOnce(null)
    const response = await POST(makeRequest())
    expect(response.status).toBe(401)
  })

  it('ensures the emailpass identity and requests the reset with its exact identifier', async () => {
    // Case-variant historical identity: the reset MUST use this identifier,
    // not customer.email — reset-token lookup is exact-match.
    mockEnsureEmailpass.mockResolvedValueOnce({
      created: true,
      providers: ['emailpass', 'google'],
      emailpassIdentifier: 'Ada@Example.com',
      emailpassPending: true,
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    expect(mockRequestPasswordReset).toHaveBeenCalledWith('Ada@Example.com')
    expect(await response.json()).toEqual({
      sent: true,
      created: true,
      providers: ['emailpass', 'google'],
      emailpassPending: true,
    })
  })

  it('falls back to a plain reset request when the backend lacks the endpoint', async () => {
    mockEnsureEmailpass.mockResolvedValueOnce(null)

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    expect(mockRequestPasswordReset).toHaveBeenCalledWith('ada@example.com')
    expect(await response.json()).toEqual({ sent: true, created: false })
  })

  it('maps a reserved email identity to 409', async () => {
    mockEnsureEmailpass.mockRejectedValueOnce(
      new AuthMethodError('email_identity_reserved', 400)
    )

    const response = await POST(makeRequest())

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      errorCode: 'email_identity_reserved',
    })
    expect(mockRequestPasswordReset).not.toHaveBeenCalled()
  })

  it('maps unexpected failures to 500 and logs', async () => {
    mockEnsureEmailpass.mockRejectedValueOnce(new Error('boom'))

    const response = await POST(makeRequest())

    expect(response.status).toBe(500)
    expect(errorMock).toHaveBeenCalled()
  })
})
