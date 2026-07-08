import { describe, expect, it, vi } from 'vitest'
import type { LicenseDetail } from '@/types/license'
import type { MedusaOrder } from '@/lib/customer-orders'
import type { MedusaCustomer } from '@/lib/medusa-auth'
import { addConnectedDiscordMember } from './connected-members'
import { lookupDiscordCustomerInfo } from './customer-lookup'

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
    policyId: 'policy_yearly',
    createdAt: '2026-01-01T00:00:00.000Z',
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
  has_account: true,
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-01T00:00:00.000Z',
}

function order(created_at: string): MedusaOrder {
  return { created_at } as MedusaOrder
}

describe('lookupDiscordCustomerInfo', () => {
  it('projects the licences backing a member and derives customer-since from orders', async () => {
    const info = await lookupDiscordCustomerInfo('discord_1', {
      getLicenseSnapshot: async () => ({
        licenses: [
          license({
            metadata: connectedTo({ email: 'owner@example.com' }, 'discord_1'),
          }),
          license({ id: 'lic_other', key: 'WCPOS-XXXX-9999' }),
        ],
        complete: true,
      }),
      findCustomerByEmail: vi.fn(async () => customer),
      listCustomerOrders: vi.fn(async () => [
        order('2021-05-01T00:00:00.000Z'),
        order('2019-03-05T12:00:00.000Z'),
      ]),
      getMemberRoleState: async () => 'has_role',
    })

    expect(info.licences).toEqual([
      {
        keySuffix: '1234',
        status: 'active',
        expiry: '2027-02-16T00:00:00.000Z',
        holderEmail: 'owner@example.com',
        usedSeats: 1,
        seatCap: 5,
        connectedAt: '2026-06-01T00:00:00.000Z',
      },
    ])
    // Earliest order, NOT customer.created_at (migrated customers carry the
    // migration date; migrated orders keep their original dates).
    expect(info.customerSince).toBe('2019-03-05T12:00:00.000Z')
    expect(info.roleState).toBe('has_role')
  })

  it('falls back to licence creation when no order history resolves', async () => {
    const info = await lookupDiscordCustomerInfo('discord_1', {
      getLicenseSnapshot: async () => ({
        licenses: [license({ metadata: connectedTo({}, 'discord_1') })],
        complete: true,
      }),
      findCustomerByEmail: vi.fn(async () => null),
      listCustomerOrders: vi.fn(async () => []),
      getMemberRoleState: async () => 'missing_role',
    })

    expect(info.customerSince).toBe('2026-01-01T00:00:00.000Z')
  })

  it('returns an empty card for a user connected to nothing', async () => {
    const findCustomerByEmail = vi.fn()
    const info = await lookupDiscordCustomerInfo('discord_unknown', {
      getLicenseSnapshot: async () => ({ licenses: [license()], complete: true }),
      findCustomerByEmail,
      listCustomerOrders: vi.fn(),
      getMemberRoleState: async () => 'not_in_guild',
    })

    expect(info.licences).toEqual([])
    expect(info.customerSince).toBeNull()
    expect(findCustomerByEmail).not.toHaveBeenCalled()
  })

  it('keeps the licence facts when Medusa enrichment or role lookup fails', async () => {
    const info = await lookupDiscordCustomerInfo('discord_1', {
      getLicenseSnapshot: async () => ({
        licenses: [
          license({ metadata: connectedTo({ email: 'owner@example.com' }, 'discord_1') }),
        ],
        complete: true,
      }),
      findCustomerByEmail: vi.fn(async () => {
        throw new Error('medusa down')
      }),
      listCustomerOrders: vi.fn(),
      getMemberRoleState: async () => {
        throw new Error('discord down')
      },
    })

    expect(info.licences).toHaveLength(1)
    expect(info.customerSince).toBe('2026-01-01T00:00:00.000Z')
    expect(info.roleState).toBe('unknown')
  })
})
