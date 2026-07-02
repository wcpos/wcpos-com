import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { InvalidCredentialsError } from '@/lib/api/errors'

const mockLogin = vi.fn()
const mockSetAuthToken = vi.fn()
const { infoMock, errorMock } = vi.hoisted(() => ({
  infoMock: vi.fn(),
  errorMock: vi.fn(),
}))

vi.mock('@/lib/medusa-auth', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  setAuthToken: (...args: unknown[]) => mockSetAuthToken(...args),
}))
vi.mock('@/lib/logger', () => ({
  authLogger: { info: infoMock, error: errorMock },
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
  })

  it('returns 400 when email is missing', async () => {
    const response = await POST(makeRequest({ password: 'secret' }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('Email and password are required')
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('returns 400 when password is missing', async () => {
    const response = await POST(makeRequest({ email: 'user@example.com' }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('Email and password are required')
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
    expect(infoMock).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
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
    expect(json.error).toBe('Invalid email or password')
    expect(mockSetAuthToken).not.toHaveBeenCalled()
    // Wrong passwords are routine — they must never hit error level, which
    // fans out to Discord alerts.
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
    expect(json.error).toBe('fetch failed')
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
    expect(json.error).toBe('Email and password are required')
    expect(mockLogin).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
  })
})
