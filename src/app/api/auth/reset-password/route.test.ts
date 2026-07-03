import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { InvalidResetTokenError } from '@/lib/api/errors'

const mockResetPassword = vi.fn()
const mockLogin = vi.fn()
const mockSetAuthToken = vi.fn()
const { infoMock, errorMock, consumeMock } = vi.hoisted(() => ({
  infoMock: vi.fn(),
  errorMock: vi.fn(),
  consumeMock: vi.fn(),
}))

vi.mock('@/lib/medusa-auth', () => ({
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
  login: (...args: unknown[]) => mockLogin(...args),
  setAuthToken: (...args: unknown[]) => mockSetAuthToken(...args),
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
  return new NextRequest('http://localhost:3000/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = {
  email: 'user@example.com',
  token: 'reset-jwt',
  password: 'new-secret',
}

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    consumeMock.mockResolvedValue({ success: true, remaining: 9 })
  })

  it.each([
    ['email', { token: 'reset-jwt', password: 'new-secret' }],
    ['token', { email: 'user@example.com', password: 'new-secret' }],
    ['password', { email: 'user@example.com', token: 'reset-jwt' }],
  ])('returns 400 when %s is missing', async (_field, body) => {
    const response = await POST(makeRequest(body))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('Email, token, and password are required')
    expect(mockResetPassword).not.toHaveBeenCalled()
  })

  it('resets the password, signs in, and returns signedIn: true', async () => {
    mockResetPassword.mockResolvedValueOnce(undefined)
    mockLogin.mockResolvedValueOnce('fresh-jwt')

    const response = await POST(makeRequest(validBody))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ success: true, signedIn: true })
    expect(mockResetPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      token: 'reset-jwt',
      password: 'new-secret',
    })
    expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'new-secret')
    expect(mockSetAuthToken).toHaveBeenCalledWith('fresh-jwt')
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('still succeeds with signedIn: false when the post-reset sign-in fails', async () => {
    mockResetPassword.mockResolvedValueOnce(undefined)
    mockLogin.mockRejectedValueOnce(new Error('medusa hiccup'))

    const response = await POST(makeRequest(validBody))
    const json = await response.json()

    // The password IS changed at this point — the response must not read as
    // a failed reset.
    expect(response.status).toBe(200)
    expect(json).toEqual({ success: true, signedIn: false })
    expect(mockSetAuthToken).not.toHaveBeenCalled()
    expect(errorMock).toHaveBeenCalledTimes(1)
  })

  it('returns 401 and logs at info for an expired/invalid token', async () => {
    mockResetPassword.mockRejectedValueOnce(new InvalidResetTokenError())

    const response = await POST(makeRequest(validBody))
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.error).toBe(
      'This password reset link is invalid or has expired. Please request a new one.'
    )
    expect(mockLogin).not.toHaveBeenCalled()
    // Expired links are routine — never error level, which fans out to alerts.
    expect(infoMock).toHaveBeenCalledTimes(1)
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('returns 400 and logs at error when the reset fails unexpectedly', async () => {
    mockResetPassword.mockRejectedValueOnce(new Error('fetch failed'))

    const response = await POST(makeRequest(validBody))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('fetch failed')
    expect(mockLogin).not.toHaveBeenCalled()
    expect(errorMock).toHaveBeenCalledTimes(1)
    expect(infoMock).not.toHaveBeenCalled()
  })

  it('returns 429 when the rate limit is exceeded', async () => {
    consumeMock.mockResolvedValueOnce({ success: false, remaining: 0 })

    const response = await POST(makeRequest(validBody))
    const json = await response.json()

    expect(response.status).toBe(429)
    expect(json.error).toBe('Too many attempts. Please try again later.')
    expect(mockResetPassword).not.toHaveBeenCalled()
  })
})
