import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LicenseDetail } from '@/types/license'
import {
  claimConnectedDiscordMember,
  getDiscordAccessByLicense,
  removeConnectedDiscordMemberForHolder,
} from './connected-member-service'
import { addConnectedDiscordMember } from './connected-members'

function license(overrides: Partial<LicenseDetail> = {}): LicenseDetail {
  return {
    id: 'lic_1',
    key: 'WCPOS-AAAA',
    status: 'active',
    expiry: null,
    maxMachines: 5,
    machines: [],
    metadata: {},
    policyId: 'policy_yearly',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('connected member service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns holder-facing access DTOs without leaking raw metadata', () => {
    const licences = [
      license({
        id: 'lic_1',
        metadata: addConnectedDiscordMember(
          { discord_access: { seatCap: 2 } },
          {
            id: 'discord_1',
            username: 'ada',
            avatar: 'hash',
            connectedAt: new Date('2026-06-01T00:00:00.000Z'),
          }
        ),
      }),
    ]

    expect(getDiscordAccessByLicense(licences)).toEqual({
      lic_1: {
        licenseId: 'lic_1',
        seatCap: 2,
        usedSeats: 1,
        members: [
          {
            id: 'discord-member-discord_1',
            handle: '@ada',
            avatarUrl: null,
            connectedAt: '2026-06-01T00:00:00.000Z',
          },
        ],
      },
    })
  })

  it('claims an active licence key and persists the member on licence metadata', async () => {
    const updateLicenseMetadata = vi.fn(async (_licenseId: string, metadata: Record<string, unknown>) =>
      license({ metadata })
    )

    await expect(
      claimConnectedDiscordMember({
        licenseKey: 'WCPOS-AAAA',
        identity: { id: 'discord_1', username: 'ada', avatar: null },
        dependencies: {
          now: () => new Date('2026-06-17T00:00:00.000Z'),
          validateLicenseKey: vi.fn(async () => ({
            valid: true,
            code: 'VALID',
            detail: 'ok',
            license: license(),
          })),
          updateLicenseMetadata,
        },
      })
    ).resolves.toEqual({ status: 'claimed', licenseId: 'lic_1', memberId: 'discord-member-discord_1' })

    expect(updateLicenseMetadata).toHaveBeenCalledWith(
      'lic_1',
      expect.objectContaining({
        discord_access: expect.objectContaining({
          members: [expect.objectContaining({ discordUserId: 'discord_1' })],
        }),
      })
    )
  })

  it('refuses a claim when the licence seat cap is full', async () => {
    const full = license({
      metadata: addConnectedDiscordMember(
        { discord_access: { seatCap: 1 } },
        { id: 'discord_1', username: 'ada', avatar: null, connectedAt: new Date('2026-06-01T00:00:00.000Z') }
      ),
    })

    await expect(
      claimConnectedDiscordMember({
        licenseKey: 'WCPOS-AAAA',
        identity: { id: 'discord_2', username: 'devon', avatar: null },
        dependencies: {
          now: () => new Date('2026-06-17T00:00:00.000Z'),
          validateLicenseKey: vi.fn(async () => ({ valid: true, code: 'VALID', detail: 'ok', license: full })),
          updateLicenseMetadata: vi.fn(),
        },
      })
    ).resolves.toEqual({ status: 'seat_cap_reached', licenseId: 'lic_1' })
  })

  it('removes a holder-owned member and blocks immediate reclaim', async () => {
    const owned = license({
      metadata: addConnectedDiscordMember(
        {},
        { id: 'discord_1', username: 'ada', avatar: null, connectedAt: new Date('2026-06-01T00:00:00.000Z') }
      ),
    })
    const updateLicenseMetadata = vi.fn(async (_licenseId: string, metadata: Record<string, unknown>) => license({ metadata }))

    await expect(
      removeConnectedDiscordMemberForHolder({
        licenseId: 'lic_1',
        memberId: 'discord-member-discord_1',
        holderLicenses: [owned],
        dependencies: {
          now: () => new Date('2026-06-18T00:00:00.000Z'),
          updateLicenseMetadata,
        },
      })
    ).resolves.toEqual({ status: 'removed', discordUserId: 'discord_1' })

    expect(updateLicenseMetadata).toHaveBeenCalledWith(
      'lic_1',
      expect.objectContaining({
        discord_access: expect.objectContaining({ blockedDiscordUserIds: ['discord_1'] }),
      })
    )
  })
})
