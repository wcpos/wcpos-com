import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LicenseDetail } from '@/types/license'
import {
  claimConnectedDiscordMember,
  getDiscordAccessByLicense,
  removeConnectedDiscordMemberForHolder,
  removeConnectedDiscordMemberSelf,
} from './connected-member-service'
import {
  addConnectedDiscordMember,
  getConnectedDiscordAccess,
} from './connected-members'

function license(overrides: Partial<LicenseDetail> = {}): LicenseDetail {
  return {
    id: 'lic_1',
    key: 'WCPOS-AAAA',
    status: 'active',
    expiry: null,
    maxMachines: 5,
    activationCount: 0,
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
          getLicense: vi.fn(async () => license()),
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
          getLicense: vi.fn(async () => full),
          updateLicenseMetadata: vi.fn(),
        },
      })
    ).resolves.toEqual({ status: 'seat_cap_reached', licenseId: 'lic_1' })
  })

  it('checks the latest metadata before claiming the last seat', async () => {
    let latest = license({ metadata: { discord_access: { seatCap: 1, members: [] } } })
    const dependencies = {
      now: () => new Date('2026-06-17T00:00:00.000Z'),
      validateLicenseKey: vi.fn(async () => ({
        valid: true,
        code: 'VALID',
        detail: 'ok',
        license: license({ metadata: { discord_access: { seatCap: 1, members: [] } } }),
      })),
      getLicense: vi.fn(async () => latest),
      updateLicenseMetadata: vi.fn(async (_licenseId: string, metadata: Record<string, unknown>) => {
        latest = license({ metadata })
        return latest
      }),
    }

    const results = await Promise.all([
      claimConnectedDiscordMember({
        licenseKey: 'WCPOS-AAAA',
        identity: { id: 'discord_1', username: 'ada', avatar: null },
        dependencies,
      }),
      claimConnectedDiscordMember({
        licenseKey: 'WCPOS-AAAA',
        identity: { id: 'discord_2', username: 'devon', avatar: null },
        dependencies,
      }),
    ])

    expect(results.map((result) => result.status).sort()).toEqual([
      'claimed',
      'seat_cap_reached',
    ])
    expect(getConnectedDiscordAccess(latest.metadata).members).toHaveLength(1)
    expect(dependencies.getLicense).toHaveBeenCalledTimes(2)
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
          getLicense: vi.fn(async () => owned),
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

  it('self-unlink frees the seat without block-listing the member', async () => {
    const connected = license({
      metadata: addConnectedDiscordMember(
        {},
        { id: 'discord_1', username: 'ada', avatar: null, connectedAt: new Date('2026-06-01T00:00:00.000Z') }
      ),
    })
    const updateLicenseMetadata = vi.fn(async (_licenseId: string, metadata: Record<string, unknown>) => license({ metadata }))

    await expect(
      removeConnectedDiscordMemberSelf({
        licenseKey: 'WCPOS-AAAA',
        discordUserId: 'discord_1',
        dependencies: {
          now: () => new Date('2026-06-18T00:00:00.000Z'),
          validateLicenseKey: vi.fn(async () => ({
            valid: true,
            code: 'VALID',
            detail: 'ok',
            license: connected,
          })),
          getLicense: vi.fn(async () => connected),
          updateLicenseMetadata,
        },
      })
    ).resolves.toEqual({ status: 'removed', licenseId: 'lic_1' })

    const written = updateLicenseMetadata.mock.calls[0][1] as {
      discord_access: { members: Array<{ removedAt?: string }>; blockedDiscordUserIds: string[] }
    }
    expect(written.discord_access.blockedDiscordUserIds).toEqual([])
    expect(written.discord_access.members[0].removedAt).toBe('2026-06-18T00:00:00.000Z')
  })

  it('self-unlink reports not_connected without writing metadata', async () => {
    const updateLicenseMetadata = vi.fn()

    await expect(
      removeConnectedDiscordMemberSelf({
        licenseKey: 'WCPOS-AAAA',
        discordUserId: 'discord_absent',
        dependencies: {
          now: () => new Date('2026-06-18T00:00:00.000Z'),
          validateLicenseKey: vi.fn(async () => ({
            valid: true,
            code: 'VALID',
            detail: 'ok',
            license: license(),
          })),
          getLicense: vi.fn(async () => license()),
          updateLicenseMetadata,
        },
      })
    ).resolves.toEqual({ status: 'not_connected', licenseId: 'lic_1' })
    expect(updateLicenseMetadata).not.toHaveBeenCalled()
  })

  it('self-unlink reports invalid_license for an unrecognised key', async () => {
    await expect(
      removeConnectedDiscordMemberSelf({
        licenseKey: 'WCPOS-NOPE',
        discordUserId: 'discord_1',
        dependencies: {
          now: () => new Date('2026-06-18T00:00:00.000Z'),
          validateLicenseKey: vi.fn(async () => ({
            valid: false,
            code: 'NOT_FOUND',
            detail: 'missing',
          })),
          getLicense: vi.fn(),
          updateLicenseMetadata: vi.fn(),
        },
      })
    ).resolves.toEqual({ status: 'invalid_license' })
  })

  it('serializes holder removals against latest license metadata', async () => {
    const withAda = addConnectedDiscordMember(
      { discord_access: { seatCap: 5 } },
      { id: 'discord_1', username: 'ada', avatar: null, connectedAt: new Date('2026-06-01T00:00:00.000Z') }
    )
    let latest = license({
      metadata: addConnectedDiscordMember(
        withAda,
        { id: 'discord_2', username: 'devon', avatar: null, connectedAt: new Date('2026-06-01T00:00:00.000Z') }
      ),
    })
    const dependencies = {
      now: () => new Date('2026-06-18T00:00:00.000Z'),
      getLicense: vi.fn(async () => latest),
      updateLicenseMetadata: vi.fn(async (_licenseId: string, metadata: Record<string, unknown>) => {
        latest = license({ metadata })
        return latest
      }),
    }

    await expect(Promise.all([
      removeConnectedDiscordMemberForHolder({
        licenseId: 'lic_1',
        memberId: 'discord-member-discord_1',
        holderLicenses: [latest],
        dependencies,
      }),
      removeConnectedDiscordMemberForHolder({
        licenseId: 'lic_1',
        memberId: 'discord-member-discord_2',
        holderLicenses: [latest],
        dependencies,
      }),
    ])).resolves.toEqual([
      { status: 'removed', discordUserId: 'discord_1' },
      { status: 'removed', discordUserId: 'discord_2' },
    ])

    const access = getConnectedDiscordAccess(latest.metadata)
    expect(access.members).toEqual([])
    expect(access.blockedDiscordUserIds.sort()).toEqual(['discord_1', 'discord_2'])
  })
})
