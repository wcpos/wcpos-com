import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'
import { AccountExistsError } from '@/lib/api/errors'
import { PASSWORD_TOO_SHORT_MESSAGE } from '@/lib/password-policy'

const mockRegister = vi.fn()
const mockSetAuthToken = vi.fn()
const { infoMock, errorMock, warnMock, consumeMock, trackServerEventMock, cookieGetMock } =
  vi.hoisted(() => ({
    infoMock: vi.fn(),
    errorMock: vi.fn(),
    warnMock: vi.fn(),
    consumeMock: vi.fn(),
    trackServerEventMock: vi.fn(),
    cookieGetMock: vi.fn(),
  }))

vi.mock('@/lib/medusa-auth', () => ({
  register: (...args: unknown[]) => mockRegister(...args),
  setAuthToken: (...args: unknown[]) => mockSetAuthToken(...args),
}))
vi.mock('@/lib/logger', () => ({
  authLogger: { info: infoMock, error: errorMock, warn: warnMock },
}))
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: () => ({ consume: consumeMock }),
  clientIp: () => '203.0.113.7',
}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: cookieGetMock })),
}))
vi.mock('@/services/core/analytics/posthog-service', () => ({
  trackServerEvent: (...args: unknown[]) => trackServerEventMock(...args),
}))

function postRegister(body: Record<string, unknown>) {
  return POST(
    new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  )
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    consumeMock.mockResolvedValue({ success: true, remaining: 4 })
    trackServerEventMock.mockResolvedValue(undefined)
    cookieGetMock.mockReturnValue({ value: 'anon_cookie_123' })
  })

  it('returns 429 when the rate limit is exceeded', async () => {
    consumeMock.mockResolvedValueOnce({ success: false, remaining: 0 })

    const response = await postRegister({
      email: 'new@example.com',
      password: 'password123',
    })
    const json = await response.json()

    expect(response.status).toBe(429)
    expect(json.error).toBe('Too many attempts. Please try again later.')
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('maps AccountExistsError to a 409 with the ACCOUNT_EXISTS code', async () => {
    // register() classifies the duplicate at the Medusa seam and throws the
    // typed error; the route just delegates to the adapter.
    mockRegister.mockRejectedValueOnce(
      new AccountExistsError('Identity with email already exists')
    )

    const response = await postRegister({
      email: 'existing@example.com',
      password: 'password123',
    })
    const json = await response.json()

    expect(response.status).toBe(409)
    expect(json).toEqual({
      error: 'Identity with email already exists',
      code: 'ACCOUNT_EXISTS',
    })
    // Duplicate accounts are routine user behaviour — info, never error
    // (error level fans out to Discord alerts).
    expect(infoMock).toHaveBeenCalledTimes(1)
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('surfaces other registration failures as a 400 with the message and logs at error', async () => {
    mockRegister.mockRejectedValueOnce(new Error('Password is too weak'))

    const response = await postRegister({
      email: 'new@example.com',
      password: 'long-enough-but-weak',
    })
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toEqual({ error: 'Password is too weak' })
    expect(errorMock).toHaveBeenCalledTimes(1)
    expect(infoMock).not.toHaveBeenCalled()
  })

  it('rejects a request missing email or password with a 400', async () => {
    const response = await postRegister({ email: 'new@example.com' })
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toEqual({ error: 'Email and password are required' })
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('rejects a password shorter than the minimum with a 400 before hitting Medusa', async () => {
    const response = await postRegister({
      email: 'new@example.com',
      password: 'short',
    })
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toEqual({ error: PASSWORD_TOO_SHORT_MESSAGE })
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('accepts a password at exactly the minimum length', async () => {
    mockRegister.mockResolvedValueOnce({
      token: 'jwt',
      customer: { id: 'cus_1' },
    })

    const response = await postRegister({
      email: 'new@example.com',
      password: '12345678',
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ success: true, customer: { id: 'cus_1' } })
    expect(mockRegister).toHaveBeenCalledTimes(1)
  })

  it('tracks signup_completed with the visitor distinct-id from the cookie', async () => {
    mockRegister.mockResolvedValueOnce({
      token: 'jwt',
      customer: { id: 'cus_42' },
    })

    const response = await postRegister({
      email: 'new@example.com',
      password: 'password123',
    })

    expect(response.status).toBe(200)
    expect(trackServerEventMock).toHaveBeenCalledWith(
      'signup_completed',
      expect.objectContaining({
        method: 'email',
        customer_id: 'cus_42',
        distinct_id: 'anon_cookie_123',
      })
    )
  })

  it('falls back to customer.id (never a shared placeholder) when the distinct-id cookie is absent', async () => {
    cookieGetMock.mockReturnValue(undefined)
    mockRegister.mockResolvedValueOnce({
      token: 'jwt',
      customer: { id: 'cus_99' },
    })

    const response = await postRegister({
      email: 'new@example.com',
      password: 'password123',
    })

    expect(response.status).toBe(200)
    expect(trackServerEventMock).toHaveBeenCalledWith(
      'signup_completed',
      expect.objectContaining({ distinct_id: 'cus_99' })
    )
  })

  it('treats a malformed JSON body as a missing-fields 400, not a failure', async () => {
    const response = await POST(
      new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not-json',
      })
    )
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toEqual({ error: 'Email and password are required' })
    expect(mockRegister).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
  })
})
