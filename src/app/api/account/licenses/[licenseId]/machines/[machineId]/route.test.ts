import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()
const mockGetAllOrders = vi.fn()
const mockExtractLicenseIdsFromOrders = vi.fn()
const mockGetLicenseMachines = vi.fn()
const mockDeactivateMachine = vi.fn()

vi.mock('@/lib/impersonation', () => ({
  assertViewOnly: async () => {},
  ViewOnlyError: class ViewOnlyError extends Error {},
}))

vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
}))

vi.mock('@/lib/customer-orders', () => ({
  getAllOrders: (...args: unknown[]) => mockGetAllOrders(...args),
}))

vi.mock('@/lib/licenses', () => ({
  extractLicenseIdsFromOrders: (...args: unknown[]) =>
    mockExtractLicenseIdsFromOrders(...args),
}))

vi.mock('@/services/core/external/license-client', () => ({
  KeygenAuthNotConfiguredError: class KeygenAuthNotConfiguredError extends Error {
    constructor() {
      super('no token')
      this.name = 'KeygenAuthNotConfiguredError'
    }
  },
  licenseClient: {
    getLicenseMachines: (...args: unknown[]) => mockGetLicenseMachines(...args),
    deactivateMachine: (...args: unknown[]) => mockDeactivateMachine(...args),
  },
}))

vi.mock('@/lib/logger', () => ({
  licenseLogger: {
    error: () => {},
  },
}))

import { DELETE } from './route'
import { KeygenAuthNotConfiguredError } from '@/services/core/external/license-client'

function makeRequest(licenseId: string, machineId: string) {
  return new NextRequest(
    `https://wcpos.com/api/account/licenses/${licenseId}/machines/${machineId}`,
    { method: 'DELETE' }
  )
}

function callDelete(licenseId: string, machineId: string) {
  return DELETE(makeRequest(licenseId, machineId), {
    params: Promise.resolve({ licenseId, machineId }),
  })
}

describe('DELETE /api/account/licenses/[licenseId]/machines/[machineId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated and never touches the license service', async () => {
    mockGetCustomer.mockResolvedValueOnce(null)

    const response = await callDelete('lic_1', 'machine_1')

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
    expect(mockGetLicenseMachines).not.toHaveBeenCalled()
    expect(mockDeactivateMachine).not.toHaveBeenCalled()
  })

  it('returns 403 when the license does not belong to the customer (ownership check)', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockGetAllOrders.mockResolvedValueOnce([{ id: 'order_1' }])
    // Customer owns lic_mine, attempts to deactivate a machine on lic_other
    mockExtractLicenseIdsFromOrders.mockReturnValueOnce(['lic_mine'])

    const response = await callDelete('lic_other', 'machine_1')

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toBe('Forbidden')
    expect(mockGetLicenseMachines).not.toHaveBeenCalled()
    expect(mockDeactivateMachine).not.toHaveBeenCalled()
  })

  it('returns 403 when the machine does not belong to the license', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockGetAllOrders.mockResolvedValueOnce([{ id: 'order_1' }])
    mockExtractLicenseIdsFromOrders.mockReturnValueOnce(['lic_mine'])
    mockGetLicenseMachines.mockResolvedValueOnce([
      { id: 'machine_a' },
      { id: 'machine_b' },
    ])

    const response = await callDelete('lic_mine', 'machine_foreign')

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toBe('Machine does not belong to this license')
    expect(mockDeactivateMachine).not.toHaveBeenCalled()
  })

  it('deactivates an owned machine and returns success', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockGetAllOrders.mockResolvedValueOnce([{ id: 'order_1' }])
    mockExtractLicenseIdsFromOrders.mockReturnValueOnce(['lic_mine'])
    mockGetLicenseMachines.mockResolvedValueOnce([{ id: 'machine_a' }])
    mockDeactivateMachine.mockResolvedValueOnce(true)

    const response = await callDelete('lic_mine', 'machine_a')

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ success: true })
    expect(mockGetLicenseMachines).toHaveBeenCalledWith('lic_mine')
    expect(mockDeactivateMachine).toHaveBeenCalledWith('machine_a')
  })

  it('returns 500 when the license service fails to deactivate', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockGetAllOrders.mockResolvedValueOnce([{ id: 'order_1' }])
    mockExtractLicenseIdsFromOrders.mockReturnValueOnce(['lic_mine'])
    mockGetLicenseMachines.mockResolvedValueOnce([{ id: 'machine_a' }])
    mockDeactivateMachine.mockResolvedValueOnce(false)

    const response = await callDelete('lic_mine', 'machine_a')

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Failed to deactivate machine')
  })

  it('returns 503 (fail loud) when Keygen machine management is not configured', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockGetAllOrders.mockResolvedValueOnce([{ id: 'order_1' }])
    mockExtractLicenseIdsFromOrders.mockReturnValueOnce(['lic_mine'])
    // No KEYGEN_API_TOKEN → the authed machine list throws.
    mockGetLicenseMachines.mockRejectedValueOnce(new KeygenAuthNotConfiguredError())

    const response = await callDelete('lic_mine', 'machine_a')

    expect(response.status).toBe(503)
    const body = await response.json()
    expect(body.error).toBe('Machine management is not configured')
    expect(mockDeactivateMachine).not.toHaveBeenCalled()
  })

  it('returns 500 when an unexpected error is thrown', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockGetAllOrders.mockRejectedValueOnce(
      new Error('Medusa unreachable')
    )

    const response = await callDelete('lic_mine', 'machine_a')

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Internal server error')
    expect(mockDeactivateMachine).not.toHaveBeenCalled()
  })
})
