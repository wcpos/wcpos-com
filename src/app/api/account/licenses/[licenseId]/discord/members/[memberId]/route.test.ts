import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetResolvedCustomerLicenses = vi.fn()
const mockRemoveConnectedDiscordMemberForHolder = vi.fn()
const mockGetLicense = vi.fn()
const mockUpdateLicenseMetadata = vi.fn()
const mockSyncDiscordProRoleForMember = vi.fn()
const mockCreateDiscordRoleSyncDependencies = vi.fn()
const mockAssertViewOnly = vi.fn(async () => {})

vi.mock('@/lib/impersonation', () => ({
  assertViewOnly: () => mockAssertViewOnly(),
  ViewOnlyError: class ViewOnlyError extends Error {},
}))

vi.mock('@/lib/customer-licenses', () => ({
  getResolvedCustomerLicenses: (...args: unknown[]) => mockGetResolvedCustomerLicenses(...args),
}))

vi.mock('@/lib/discord/connected-member-service', () => ({
  getLicensesForDiscordUser: vi.fn(),
  removeConnectedDiscordMemberForHolder: (...args: unknown[]) =>
    mockRemoveConnectedDiscordMemberForHolder(...args),
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

vi.mock('@/lib/discord/sync', () => ({
  syncDiscordProRoleForMember: (...args: unknown[]) => mockSyncDiscordProRoleForMember(...args),
}))

vi.mock('@/lib/discord/default-sync', () => ({
  createDiscordRoleSyncDependencies: (...args: unknown[]) => mockCreateDiscordRoleSyncDependencies(...args),
}))

vi.mock('@/lib/discord/config', () => ({
  isDiscordConfigured: () => true,
}))

vi.mock('@/lib/logger', () => ({
  infraLogger: { warn: () => {}, error: () => {} },
}))

import { DELETE } from './route'
import { KeygenAuthNotConfiguredError } from '@/services/core/external/license-client'

function callDelete(licenseId = 'lic_1', memberId = 'member_1') {
  return DELETE(
    new NextRequest(`https://wcpos.com/api/account/licenses/${licenseId}/discord/members/${memberId}`, { method: 'DELETE' }),
    { params: Promise.resolve({ licenseId, memberId }) }
  )
}

describe('DELETE /api/account/licenses/[licenseId]/discord/members/[memberId]', () => {
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
    expect(mockRemoveConnectedDiscordMemberForHolder).not.toHaveBeenCalled()
  })

  it('returns 403 when the licence is not owned by the current holder', async () => {
    mockGetResolvedCustomerLicenses.mockResolvedValueOnce({ authenticated: true, licenses: [] })
    mockRemoveConnectedDiscordMemberForHolder.mockResolvedValueOnce({ status: 'license_not_found' })

    const response = await callDelete('lic_other', 'member_1')

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ errorCode: 'forbidden' })
  })

  it('returns 503 (fail loud) when Keygen seat management is not configured', async () => {
    mockGetResolvedCustomerLicenses.mockResolvedValueOnce({ authenticated: true, licenses: [{ id: 'lic_1' }] })
    // No KEYGEN_API_TOKEN → the authed getLicense inside removal throws.
    mockRemoveConnectedDiscordMemberForHolder.mockRejectedValueOnce(new KeygenAuthNotConfiguredError())

    const response = await callDelete('lic_1', 'member_1')

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ errorCode: 'discord_management_unconfigured' })
    expect(mockSyncDiscordProRoleForMember).not.toHaveBeenCalled()
  })

  it('removes the member and resyncs that Discord user role', async () => {
    const licenses = [{ id: 'lic_1' }]
    const deps = { now: () => new Date() }
    mockGetResolvedCustomerLicenses.mockResolvedValueOnce({ authenticated: true, licenses })
    mockRemoveConnectedDiscordMemberForHolder.mockResolvedValueOnce({ status: 'removed', discordUserId: 'discord_1' })
    mockCreateDiscordRoleSyncDependencies.mockReturnValueOnce(deps)
    mockSyncDiscordProRoleForMember.mockResolvedValueOnce({ action: 'removed', discordUserId: 'discord_1' })

    const response = await callDelete('lic_1', 'member_1')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(mockRemoveConnectedDiscordMemberForHolder).toHaveBeenCalledWith({
      licenseId: 'lic_1',
      memberId: 'member_1',
      holderLicenses: licenses,
      dependencies: expect.objectContaining({
        getLicense: expect.any(Function),
        updateLicenseMetadata: expect.any(Function),
      }),
    })
    expect(mockSyncDiscordProRoleForMember).toHaveBeenCalledWith('discord_1', deps)
  })
})
