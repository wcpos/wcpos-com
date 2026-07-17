import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetCustomer = vi.fn()
const mockDeleteCustomerAccount = vi.fn()
const mockLogout = vi.fn()
const { errorMock, infoMock, assertViewOnly, sameOrigin, consume } = vi.hoisted(
  () => ({
    errorMock: vi.fn(),
    infoMock: vi.fn(),
    assertViewOnly: vi.fn(),
    sameOrigin: vi.fn(() => true),
    consume: vi.fn(async () => ({ success: true })),
  })
)

vi.mock('@/lib/impersonation', () => ({
  assertViewOnly,
  ViewOnlyError: class ViewOnlyError extends Error {},
}))
vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
  deleteCustomerAccount: (...args: unknown[]) =>
    mockDeleteCustomerAccount(...args),
  logout: (...args: unknown[]) => mockLogout(...args),
}))
vi.mock('@/lib/logger', () => ({
  authLogger: { error: errorMock, info: infoMock },
}))
vi.mock('@/lib/api/same-origin', () => ({
  isSameOriginRequest: sameOrigin,
}))
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: () => ({ consume }),
  clientIp: () => '127.0.0.1',
}))

import { ViewOnlyError } from '@/lib/impersonation'
import { DELETE } from './route'

function makeRequest() {
  return new Request('http://localhost:3000/api/account', {
    method: 'DELETE',
  })
}

describe('DELETE /api/account', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sameOrigin.mockReturnValue(true)
    consume.mockResolvedValue({ success: true })
    assertViewOnly.mockResolvedValue(undefined)
    mockGetCustomer.mockResolvedValue({
      id: 'cus_1',
      email: 'ada@example.com',
    })
    mockDeleteCustomerAccount.mockResolvedValue(undefined)
    mockLogout.mockResolvedValue(undefined)
  })

  it('rejects cross-origin requests', async () => {
    sameOrigin.mockReturnValue(false)

    const response = await DELETE(makeRequest())

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ errorCode: 'invalid_origin' })
    expect(mockDeleteCustomerAccount).not.toHaveBeenCalled()
  })

  it('rejects when rate limited', async () => {
    consume.mockResolvedValue({ success: false })

    const response = await DELETE(makeRequest())

    expect(response.status).toBe(429)
    expect(await response.json()).toEqual({ errorCode: 'rate_limited' })
    expect(mockDeleteCustomerAccount).not.toHaveBeenCalled()
  })

  it('rejects read-only impersonation — an admin viewing-as must never delete', async () => {
    assertViewOnly.mockRejectedValue(new ViewOnlyError())

    const response = await DELETE(makeRequest())

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      errorCode: 'read_only_inspection',
    })
    expect(mockDeleteCustomerAccount).not.toHaveBeenCalled()
    expect(mockLogout).not.toHaveBeenCalled()
  })

  it('rejects when not signed in', async () => {
    mockGetCustomer.mockResolvedValue(null)

    const response = await DELETE(makeRequest())

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ errorCode: 'unauthorized' })
    expect(mockDeleteCustomerAccount).not.toHaveBeenCalled()
  })

  it('deletes the account, then clears the session', async () => {
    const response = await DELETE(makeRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ deleted: true })
    expect(mockDeleteCustomerAccount).toHaveBeenCalledTimes(1)
    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

  it('keeps the session when the backend delete fails, so a retry is possible', async () => {
    mockDeleteCustomerAccount.mockRejectedValue(new Error('backend down'))

    const response = await DELETE(makeRequest())

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({
      errorCode: 'account_deletion_failed',
    })
    expect(mockLogout).not.toHaveBeenCalled()
    expect(errorMock).toHaveBeenCalled()
  })
})
