import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockLogin = vi.fn()
const mockSetAuthToken = vi.fn()

vi.mock('@/lib/medusa-auth', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  setAuthToken: (...args: unknown[]) => mockSetAuthToken(...args),
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
  })

  it('returns 401 with the error message when login fails', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'))

    const response = await POST(
      makeRequest({ email: 'user@example.com', password: 'wrong' })
    )
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.error).toBe('Invalid credentials')
    expect(mockSetAuthToken).not.toHaveBeenCalled()
  })

  it('returns 401 when the request body is not valid JSON', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: 'not-json',
      })
    )
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(typeof json.error).toBe('string')
    expect(mockLogin).not.toHaveBeenCalled()
  })
})
