import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  AccountSecurityHoldError,
  InvalidCredentialsError,
} from '@/lib/api/errors'

const mockLogin = vi.fn()
const mockAssertCustomerAccess = vi.fn()
const mockSetAuthToken = vi.fn()
const {
  infoMock,
  errorMock,
  consumeMock,
  savedCustomerLocaleMock,
  writeLocaleCookieMock,
} = vi.hoisted(() => ({
  infoMock: vi.fn(),
  errorMock: vi.fn(),
  consumeMock: vi.fn(),
  savedCustomerLocaleMock: vi.fn(),
  writeLocaleCookieMock: vi.fn(),
}))

vi.mock('@/lib/medusa-auth', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  assertCustomerAccess: (...args: unknown[]) =>
    mockAssertCustomerAccess(...args),
  setAuthToken: (...args: unknown[]) => mockSetAuthToken(...args),
}))
vi.mock('@/lib/account-locale', () => ({
  savedCustomerLocale: (...args: unknown[]) => savedCustomerLocaleMock(...args),
  writeLocaleCookie: (...args: unknown[]) => writeLocaleCookieMock(...args),
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
  return new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    consumeMock.mockResolvedValue({ success: true, remaining: 9 })
    savedCustomerLocaleMock.mockResolvedValue(null)
    mockAssertCustomerAccess.mockResolvedValue({ id: 'cus_ordinary' })
  })

  it('returns 429 when the rate limit is exceeded', async () => {
    consumeMock.mockResolvedValueOnce({ success: false, remaining: 0 })

    const response = await POST(
      makeRequest({ email: 'user@example.com', password: 'secret' })
    )
    const json = await response.json()

    expect(response.status).toBe(429)
    expect(json.errorCode).toBe('rate_limited')
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('returns 400 when email is missing', async () => {
    const response = await POST(makeRequest({ password: 'secret' }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.errorCode).toBe('credentials_required')
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('returns 400 when password is missing', async () => {
    const response = await POST(makeRequest({ email: 'user@example.com' }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.errorCode).toBe('credentials_required')
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('logs in, stores the token, and returns success', async () => {
    mockLogin.mockResolvedValueOnce('jwt-token')
    mockSetAuthToken.mockResolvedValueOnce(undefined)

    const response = await POST(
      makeRequest({ email: 'user@example.com', password: 'secret' })
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ success: true })
    expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'secret')
    expect(mockSetAuthToken).toHaveBeenCalledWith('jwt-token')
    expect(writeLocaleCookieMock).not.toHaveBeenCalled()
    expect(infoMock).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('seeds the saved account language cookie on a successful login', async () => {
    mockLogin.mockResolvedValueOnce('jwt-token')
    mockSetAuthToken.mockResolvedValueOnce(undefined)
    savedCustomerLocaleMock.mockResolvedValueOnce('fr')

    const response = await POST(
      makeRequest({ email: 'user@example.com', password: 'secret' })
    )

    expect(response.status).toBe(200)
    expect(writeLocaleCookieMock).toHaveBeenCalledWith('fr')
  })

  it('never fails login when applying the saved locale throws', async () => {
    mockLogin.mockResolvedValueOnce('jwt-token')
    mockSetAuthToken.mockResolvedValueOnce(undefined)
    savedCustomerLocaleMock.mockRejectedValueOnce(new Error('medusa down'))

    const response = await POST(
      makeRequest({ email: 'user@example.com', password: 'secret' })
    )

    expect(response.status).toBe(200)
    expect(errorMock).toHaveBeenCalled()
  })

  it('returns 401 and logs at info for a routine wrong-password rejection', async () => {
    mockLogin.mockRejectedValueOnce(
      new InvalidCredentialsError('Invalid email or password')
    )

    const response = await POST(
      makeRequest({ email: 'user@example.com', password: 'wrong' })
    )
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.errorCode).toBe('invalid_credentials')
    expect(mockSetAuthToken).not.toHaveBeenCalled()
    // Wrong passwords are routine — they must never hit error level, which
    // fans out to Discord alerts.
    expect(infoMock).toHaveBeenCalledTimes(1)
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('returns 403 without storing a token when the customer is held', async () => {
    mockLogin.mockResolvedValueOnce('held-jwt')
    mockAssertCustomerAccess.mockRejectedValueOnce(
      new AccountSecurityHoldError()
    )

    const response = await POST(
      makeRequest({ email: 'held@example.com', password: 'correct' })
    )
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json.errorCode).toBe('account_security_hold')
    expect(mockAssertCustomerAccess).toHaveBeenCalledWith('held-jwt')
    expect(mockSetAuthToken).not.toHaveBeenCalled()
    expect(infoMock).toHaveBeenCalledTimes(1)
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('returns 401 and logs at error when login fails unexpectedly', async () => {
    mockLogin.mockRejectedValueOnce(new Error('fetch failed'))

    const response = await POST(
      makeRequest({ email: 'user@example.com', password: 'secret' })
    )
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.errorCode).toBe('login_failed')
    expect(mockSetAuthToken).not.toHaveBeenCalled()
    expect(errorMock).toHaveBeenCalledTimes(1)
    expect(infoMock).not.toHaveBeenCalled()
  })

  it('returns 400 when the request body is not valid JSON', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: 'not-json',
      })
    )
    const json = await response.json()

    // A malformed body is a client mistake, not a login failure: it falls
    // through to the missing-fields 400 and never reaches error level.
    expect(response.status).toBe(400)
    expect(json.errorCode).toBe('credentials_required')
    expect(mockLogin).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
  })
})
