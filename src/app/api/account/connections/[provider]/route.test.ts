import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()
const mockUpdateCustomer = vi.fn()
const mockDisconnect = vi.fn()
const { errorMock, warnMock, assertViewOnly, sameOrigin } = vi.hoisted(() => ({
  errorMock: vi.fn(),
  warnMock: vi.fn(),
  assertViewOnly: vi.fn(),
  sameOrigin: vi.fn(() => true),
}))

vi.mock('@/lib/impersonation', () => ({
  assertViewOnly,
  ViewOnlyError: class ViewOnlyError extends Error {},
}))
vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
  updateCustomer: (...args: unknown[]) => mockUpdateCustomer(...args),
}))
vi.mock('@/lib/auth-methods', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth-methods')>(
    '@/lib/auth-methods'
  )
  return {
    AuthMethodError: actual.AuthMethodError,
    disconnectCustomerAuthMethod: (...args: unknown[]) =>
      mockDisconnect(...args),
  }
})
vi.mock('@/lib/logger', () => ({
  apiLogger: { error: errorMock, warn: warnMock },
}))
vi.mock('@/lib/api/same-origin', () => ({
  isSameOriginRequest: sameOrigin,
}))

import { AuthMethodError } from '@/lib/auth-methods'
import { DELETE } from './route'

function callDelete(provider: string) {
  return DELETE(
    new NextRequest(`http://localhost:3000/api/account/connections/${provider}`, {
      method: 'DELETE',
    }),
    { params: Promise.resolve({ provider }) }
  )
}

describe('DELETE /api/account/connections/[provider]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sameOrigin.mockReturnValue(true)
    assertViewOnly.mockResolvedValue(undefined)
    mockGetCustomer.mockResolvedValue({
      id: 'cus_1',
      email: 'ada@example.com',
      metadata: {
        auth_providers: ['google', 'github'],
        last_sign_in_provider: 'google',
      },
    })
    mockUpdateCustomer.mockResolvedValue({})
  })

  it('rejects unknown providers (incl. discord — managed per-licence)', async () => {
    for (const provider of ['discord', 'emailpass', 'facebook']) {
      const response = await callDelete(provider)
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({ errorCode: 'unknown_provider' })
    }
    expect(mockDisconnect).not.toHaveBeenCalled()
  })

  it('returns 403 read_only_inspection while impersonating', async () => {
    const { ViewOnlyError } = await import('@/lib/impersonation')
    assertViewOnly.mockRejectedValueOnce(new ViewOnlyError())
    const response = await callDelete('google')
    expect(response.status).toBe(403)
  })

  it('disconnects and scrubs the attribution metadata', async () => {
    mockDisconnect.mockResolvedValueOnce({ providers: ['emailpass', 'github'] })

    const response = await callDelete('google')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      providers: ['emailpass', 'github'],
    })
    expect(mockDisconnect).toHaveBeenCalledWith('google')
    expect(mockUpdateCustomer).toHaveBeenCalledWith({
      metadata: expect.objectContaining({
        auth_providers: ['github'],
        last_sign_in_provider: 'github',
      }),
    })
  })

  it('still succeeds when the metadata scrub fails (identity already gone)', async () => {
    mockDisconnect.mockResolvedValueOnce({ providers: ['emailpass'] })
    mockUpdateCustomer.mockRejectedValueOnce(new Error('metadata boom'))

    const response = await callDelete('google')

    expect(response.status).toBe(200)
    expect(warnMock).toHaveBeenCalled()
  })

  it('maps the last-method guard to 409', async () => {
    mockDisconnect.mockRejectedValueOnce(
      new AuthMethodError('last_sign_in_method', 400)
    )

    const response = await callDelete('google')

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ errorCode: 'last_sign_in_method' })
    expect(mockUpdateCustomer).not.toHaveBeenCalled()
  })

  it('maps a not-connected provider to 404', async () => {
    mockDisconnect.mockRejectedValueOnce(
      new AuthMethodError('provider_not_connected', 404)
    )

    const response = await callDelete('github')

    expect(response.status).toBe(404)
  })

  it('maps unexpected failures to 500 and logs', async () => {
    mockDisconnect.mockRejectedValueOnce(new Error('boom'))

    const response = await callDelete('google')

    expect(response.status).toBe(500)
    expect(errorMock).toHaveBeenCalled()
  })
})
