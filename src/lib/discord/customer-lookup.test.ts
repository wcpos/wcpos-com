import { describe, expect, it, vi } from 'vitest'
import type { LicenseDetail, LicenseMachine } from '@/types/license'
import type { MedusaOrder } from '@/lib/customer-orders'
import type { MedusaCustomer } from '@/lib/medusa-auth'
import { DEFAULT_YEARLY_POLICY_ID } from '@/lib/plans'
import { addConnectedDiscordMember } from './connected-members'
import { lookupDiscordCustomerInfo, mapMachineToSite } from './customer-lookup'

function license(overrides: Partial<LicenseDetail> = {}): LicenseDetail {
  return {
    id: 'lic_1',
    key: 'WCPOS-AAAA-1234',
    status: 'active',
    expiry: '2027-02-16T00:00:00.000Z',
    maxMachines: 5,
    activationCount: 0,
    machines: [],
    metadata: {},
    policyId: 'policy_unregistered',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function machine(overrides: Partial<LicenseMachine> = {}): LicenseMachine {
  return {
    id: 'mach_1',
    fingerprint: 'fp-1',
    name: 'machine-name',
    metadata: {},
    createdAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  }
}

function connectedTo(metadata: Record<string, unknown>, discordUserId: string) {
  return addConnectedDiscordMember(metadata, {
    id: discordUserId,
    username: 'ada',
    avatar: null,
    connectedAt: new Date('2026-06-01T00:00:00.000Z'),
  })
}

const customer: MedusaCustomer = {
  id: 'cus_1',
  email: 'owner@example.com',
  first_name: 'Ada',
  last_name: 'Lovelace',
  has_account: true,
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-01T00:00:00.000Z',
}

function order(created_at: string): MedusaOrder {
  return { created_at } as MedusaOrder
}

const noMachines = async () => []

describe('lookupDiscordCustomerInfo', () => {
  it('projects the licences backing a member and derives customer-since from orders', async () => {
    const info = await lookupDiscordCustomerInfo('discord_1', {
      listAllLicenses: async () => [
        license({
          policyId: DEFAULT_YEARLY_POLICY_ID,
          metadata: connectedTo({ email: 'owner@example.com' }, 'discord_1'),
        }),
        license({ id: 'lic_other', key: 'WCPOS-XXXX-9999' }),
      ],
      findCustomerByEmail: vi.fn(async () => customer),
      listCustomerOrders: vi.fn(async () => [
        order('2021-05-01T00:00:00.000Z'),
        order('2019-03-05T12:00:00.000Z'),
      ]),
      getLicenseMachines: vi.fn(async () => [
        machine({ metadata: { domain: 'shop.example.com', lastSeenAt: '2026-07-01T00:00:00.000Z', pluginVersion: '1.9.8' } }),
      ]),
      getMemberRoleState: async () => 'has_role',
    })

    expect(info.licences).toEqual([
      {
        keySuffix: '1234',
        status: 'active',
        expiry: '2027-02-16T00:00:00.000Z',
        planId: 'yearly',
        holderEmail: 'owner@example.com',
        holderName: 'Ada Lovelace',
        usedSeats: 1,
        seatCap: 5,
        connectedAt: '2026-06-01T00:00:00.000Z',
        sites: [
          {
            label: 'shop.example.com',
            url: 'https://shop.example.com',
            lastSeenAt: '2026-07-01T00:00:00.000Z',
            pluginVersion: '1.9.8',
          },
        ],
      },
    ])
    // Earliest order, NOT customer.created_at (migrated customers carry the
    // migration date; migrated orders keep their original dates).
    expect(info.customerSince).toBe('2019-03-05T12:00:00.000Z')
    expect(info.roleState).toBe('has_role')
  })

  it('maps an unregistered policy id to a null plan — never guessed from expiry (#526)', async () => {
    const info = await lookupDiscordCustomerInfo('discord_1', {
      // Migrated expired-yearly shape: null expiry, unregistered policy.
      listAllLicenses: async () => [
        license({ expiry: null, metadata: connectedTo({}, 'discord_1') }),
      ],
      findCustomerByEmail: vi.fn(async () => null),
      listCustomerOrders: vi.fn(async () => []),
      getLicenseMachines: noMachines,
      getMemberRoleState: async () => 'missing_role',
    })

    expect(info.licences[0].planId).toBeNull()
  })

  it('falls back to licence creation when no order history resolves', async () => {
    const info = await lookupDiscordCustomerInfo('discord_1', {
      listAllLicenses: async () => [license({ metadata: connectedTo({}, 'discord_1') })],
      findCustomerByEmail: vi.fn(async () => null),
      listCustomerOrders: vi.fn(async () => []),
      getLicenseMachines: noMachines,
      getMemberRoleState: async () => 'missing_role',
    })

    expect(info.customerSince).toBe('2026-01-01T00:00:00.000Z')
  })

  it('returns an empty card for a user connected to nothing', async () => {
    const findCustomerByEmail = vi.fn()
    const info = await lookupDiscordCustomerInfo('discord_unknown', {
      listAllLicenses: async () => [license()],
      findCustomerByEmail,
      listCustomerOrders: vi.fn(),
      getLicenseMachines: noMachines,
      getMemberRoleState: async () => 'not_in_guild',
    })

    expect(info.licences).toEqual([])
    expect(info.customerSince).toBeNull()
    expect(findCustomerByEmail).not.toHaveBeenCalled()
  })

  it('keeps the licence facts when Medusa, Keygen machines or role lookup fail', async () => {
    const info = await lookupDiscordCustomerInfo('discord_1', {
      listAllLicenses: async () => [
        license({ metadata: connectedTo({ email: 'owner@example.com' }, 'discord_1') }),
      ],
      findCustomerByEmail: vi.fn(async () => {
        throw new Error('medusa down')
      }),
      listCustomerOrders: vi.fn(),
      getLicenseMachines: vi.fn(async () => {
        throw new Error('keygen auth missing')
      }),
      getMemberRoleState: async () => {
        throw new Error('discord down')
      },
    })

    expect(info.licences).toHaveLength(1)
    expect(info.licences[0].sites).toEqual([])
    expect(info.customerSince).toBe('2026-01-01T00:00:00.000Z')
    expect(info.roleState).toBe('unknown')
  })

  it('enriches distinct holder emails concurrently', async () => {
    let activeLookups = 0
    let maxActiveLookups = 0
    const findCustomerByEmail = vi.fn(async (email: string) => {
      activeLookups++
      maxActiveLookups = Math.max(maxActiveLookups, activeLookups)
      await new Promise((resolve) => setTimeout(resolve, 10))
      activeLookups--
      return { ...customer, id: email, email }
    })

    const info = await lookupDiscordCustomerInfo('discord_1', {
      listAllLicenses: async () => [
        license({
          id: 'lic_a',
          key: 'WCPOS-AAAA-1111',
          metadata: connectedTo({ email: 'a@example.com' }, 'discord_1'),
        }),
        license({
          id: 'lic_b',
          key: 'WCPOS-BBBB-2222',
          metadata: connectedTo({ email: 'b@example.com' }, 'discord_1'),
        }),
      ],
      findCustomerByEmail,
      listCustomerOrders: vi.fn(async () => [order('2021-05-01T00:00:00.000Z')]),
      getLicenseMachines: noMachines,
      getMemberRoleState: async () => 'has_role',
    })

    expect(info.licences).toHaveLength(2)
    expect(findCustomerByEmail).toHaveBeenCalledTimes(2)
    expect(maxActiveLookups).toBe(2)
  })
})

describe('mapMachineToSite', () => {
  it('prefers domain, then siteUrl, then machine name — the account-UI precedence', () => {
    expect(
      mapMachineToSite(machine({ metadata: { domain: 'shop.example.com', siteUrl: 'https://www.shop.example.com' } }))
    ).toMatchObject({ label: 'shop.example.com', url: 'https://www.shop.example.com' })
    expect(
      mapMachineToSite(machine({ metadata: { siteUrl: 'https://other.example.com' } }))
    ).toMatchObject({ label: 'https://other.example.com', url: 'https://other.example.com' })
    expect(mapMachineToSite(machine())).toMatchObject({ label: 'machine-name', url: null })
  })

  it('falls back to the fingerprint on a bare legacy machine and keeps null freshness', () => {
    expect(mapMachineToSite(machine({ name: null }))).toEqual({
      label: 'fp-1',
      url: null,
      lastSeenAt: null,
      pluginVersion: null,
    })
  })
})
