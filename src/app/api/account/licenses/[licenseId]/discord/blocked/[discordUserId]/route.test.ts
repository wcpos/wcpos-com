import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetResolvedCustomerLicenses = vi.fn()
const mockUnblockConnectedDiscordUserForHolder = vi.fn()
const mockGetLicense = vi.fn()
const mockUpdateLicenseMetadata = vi.fn()
const mockAssertViewOnly = vi.fn(async () => {})

vi.mock('@/lib/impersonation', () => ({
  assertViewOnly: () => mockAssertViewOnly(),
  ViewOnlyError: class ViewOnlyError extends Error {},
}))

vi.mock('@/lib/customer-licenses', () => ({
  getResolvedCustomerLicenses: (...args: unknown[]) => mockGetResolvedCustomerLicenses(...args),
}))

vi.mock('@/lib/discord/connected-member-service', () => ({
  unblockConnectedDiscordUserForHolder: (...args: unknown[]) =>
    mockUnblockConnectedDiscordUserForHolder(...args),
}))

vi.mock('@/services/core/external/license-client', () => ({
  KeygenAuthNotConfiguredError: class KeygenAuthNotConfiguredError extends Error {
    constructor() {
      super('no token')
      this.name = 'KeygenAuthNotConfiguredError'
    }
  },
  licenseClient: {
    getLicense: (...args: unknown[]) => mockGetLicense(...args),
    updateLicenseMetadata: (...args: unknown[]) => mockUpdateLicenseMetadata(...args),
  },
}))

vi.mock('@/lib/logger', () => ({
  infraLogger: { warn: () => {}, error: () => {} },
}))

import { DELETE } from './route'
import { KeygenAuthNotConfiguredError } from '@/services/core/external/license-client'

function callDelete(licenseId = 'lic_1', discordUserId = 'discord_1') {
  return DELETE(
    new NextRequest(
      `https://wcpos.com/api/account/licenses/${licenseId}/discord/blocked/${discordUserId}`,
      { method: 'DELETE' }
    ),
    { params: Promise.resolve({ licenseId, discordUserId }) }
  )
}

describe('DELETE /api/account/licenses/[licenseId]/discord/blocked/[discordUserId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAssertViewOnly.mockResolvedValue(undefined)
  })

  it('returns 403 read_only_inspection while impersonating', async () => {
    const { ViewOnlyError } = await import('@/lib/impersonation')
    mockAssertViewOnly.mockRejectedValueOnce(new ViewOnlyError())

    const response = await callDelete()

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ errorCode: 'read_only_inspection' })
    expect(mockGetResolvedCustomerLicenses).not.toHaveBeenCalled()
  })

  it('returns 401 when the holder is not authenticated', async () => {
    mockGetResolvedCustomerLicenses.mockResolvedValueOnce({ authenticated: false, licenses: [] })

    const response = await callDelete()

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ errorCode: 'unauthorized' })
    expect(mockUnblockConnectedDiscordUserForHolder).not.toHaveBeenCalled()
  })

  it('returns 403 when the licence is not owned by the current holder', async () => {
    mockGetResolvedCustomerLicenses.mockResolvedValueOnce({ authenticated: true, licenses: [] })
    mockUnblockConnectedDiscordUserForHolder.mockResolvedValueOnce({ status: 'license_not_found' })

    const response = await callDelete('lic_other', 'discord_1')

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ errorCode: 'forbidden' })
  })

  it('returns 404 when the Discord user is not on the block list', async () => {
    mockGetResolvedCustomerLicenses.mockResolvedValueOnce({ authenticated: true, licenses: [{ id: 'lic_1' }] })
    mockUnblockConnectedDiscordUserForHolder.mockResolvedValueOnce({ status: 'not_blocked' })

    const response = await callDelete('lic_1', 'discord_unblocked')

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ errorCode: 'not_blocked' })
  })

  it('returns 503 (fail loud) when Keygen seat management is not configured', async () => {
    mockGetResolvedCustomerLicenses.mockResolvedValueOnce({ authenticated: true, licenses: [{ id: 'lic_1' }] })
    mockUnblockConnectedDiscordUserForHolder.mockRejectedValueOnce(new KeygenAuthNotConfiguredError())

    const response = await callDelete('lic_1', 'discord_1')

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ errorCode: 'discord_management_unconfigured' })
  })

  it('unblocks the Discord user for the holder-owned licence', async () => {
    const licenses = [{ id: 'lic_1' }]
    mockGetResolvedCustomerLicenses.mockResolvedValueOnce({ authenticated: true, licenses })
    mockUnblockConnectedDiscordUserForHolder.mockResolvedValueOnce({
      status: 'unblocked',
      discordUserId: 'discord_1',
    })

    const response = await callDelete('lic_1', 'discord_1')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(mockUnblockConnectedDiscordUserForHolder).toHaveBeenCalledWith({
      licenseId: 'lic_1',
      discordUserId: 'discord_1',
      holderLicenses: licenses,
      dependencies: expect.objectContaining({
        getLicense: expect.any(Function),
        updateLicenseMetadata: expect.any(Function),
      }),
    })
  })
})
