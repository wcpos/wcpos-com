import { describe, expect, it } from 'vitest'
import {
  formatCustomerInfoReply,
  formatLinkReply,
  formatUnlinkReply,
  getInvokingUser,
  getStringOption,
  hasCustomerInfoPermission,
  type DiscordInteraction,
} from './interactions'

function interaction(overrides: Partial<DiscordInteraction> = {}): DiscordInteraction {
  return {
    type: 2,
    application_id: 'app_1',
    token: 'token_1',
    ...overrides,
  }
}

describe('discord interaction helpers', () => {
  it('resolves the invoking user from the guild member, falling back to the DM user', () => {
    const member = { id: 'u1', username: 'ada', avatar: null }
    expect(getInvokingUser(interaction({ member: { user: member } }))).toEqual(member)
    expect(getInvokingUser(interaction({ user: member }))).toEqual(member)
    expect(getInvokingUser(interaction())).toBeNull()
  })

  it('reads trimmed string options and rejects blank ones', () => {
    const withKey = interaction({
      data: { name: 'link', options: [{ name: 'key', value: '  WCPOS-AAAA ' }] },
    })
    expect(getStringOption(withKey, 'key')).toBe('WCPOS-AAAA')
    expect(getStringOption(withKey, 'missing')).toBeNull()
    expect(
      getStringOption(
        interaction({ data: { name: 'link', options: [{ name: 'key', value: '   ' }] } }),
        'key'
      )
    ).toBeNull()
  })

  it.each([
    ['Manage Guild', '32', true],
    ['Administrator', '8', true],
    ['Administrator among other bits', '2147483656', true],
    ['no admin bits', '2147483648', false],
    ['zero', '0', false],
    ['garbage', 'not-a-number', false],
  ])('permission check: %s → %s', (_label, permissions, expected) => {
    expect(
      hasCustomerInfoPermission(interaction({ member: { permissions } }))
    ).toBe(expected)
  })

  it('denies the customer-info permission when the member block is absent', () => {
    expect(hasCustomerInfoPermission(interaction())).toBe(false)
  })
})

describe('discord interaction replies', () => {
  it('masks the licence key down to its last four characters', () => {
    const reply = formatLinkReply(
      { status: 'claimed', licenseId: 'lic_1', memberId: 'm1' },
      'WCPOS-AAAA-BBBB-1234'
    )
    expect(reply).toContain('`****-1234`')
    expect(reply).not.toContain('WCPOS-AAAA')
  })

  it('formats every claim outcome', () => {
    const key = 'WCPOS-1234'
    expect(formatLinkReply({ status: 'claimed', licenseId: 'l', memberId: 'm' }, key)).toMatch(/^✅/)
    expect(formatLinkReply({ status: 'already_connected', licenseId: 'l', memberId: 'm' }, key)).toMatch(/^ℹ️/)
    expect(formatLinkReply({ status: 'invalid_license' }, key)).toMatch(/not recognised/)
    expect(formatLinkReply({ status: 'license_not_active', licenseId: 'l' }, key)).toMatch(/not active/)
    expect(formatLinkReply({ status: 'blocked', licenseId: 'l' }, key)).toMatch(/holder removed/)
    expect(formatLinkReply({ status: 'seat_cap_reached', licenseId: 'l' }, key)).toMatch(/no free Discord seats/)
  })

  it('formats self-unlink outcomes, pointing role removal at the nightly sync', () => {
    const key = 'WCPOS-1234'
    expect(formatUnlinkReply({ status: 'removed', licenseId: 'l' }, key)).toMatch(/nightly sync/)
    expect(formatUnlinkReply({ status: 'not_connected', licenseId: 'l' }, key)).toMatch(/not connected/)
    expect(formatUnlinkReply({ status: 'invalid_license' }, key)).toMatch(/not recognised/)
  })

  it('formats the customer info card with licences, customer-since and role state', () => {
    const reply = formatCustomerInfoReply(
      {
        licences: [
          {
            keySuffix: '1234',
            status: 'active',
            expiry: '2027-02-16T00:00:00.000Z',
            holderEmail: 'owner@example.com',
            usedSeats: 2,
            seatCap: 5,
            connectedAt: '2026-06-01T00:00:00.000Z',
          },
          {
            keySuffix: '9999',
            status: 'expired',
            expiry: null,
            holderEmail: null,
            usedSeats: 1,
            seatCap: 5,
            connectedAt: null,
          },
        ],
        customerSince: '2019-03-05T12:00:00.000Z',
        roleState: 'has_role',
      },
      { id: 'u1', username: 'ada' }
    )

    expect(reply).toContain('Customer info — @ada')
    expect(reply).toContain('Customer since: 2019-03-05')
    expect(reply).toContain('Pro role: held.')
    expect(reply).toContain('`****-1234` — active, expires 2027-02-16 · owner@example.com · seats 2/5 · connected 2026-06-01')
    expect(reply).toContain('`****-9999` — expired, lifetime · holder unknown · seats 1/5 · connection date unknown')
  })

  it('formats the no-licences card with a mention fallback for the username', () => {
    const reply = formatCustomerInfoReply(
      { licences: [], customerSince: null, roleState: 'not_in_guild' },
      { id: 'u2', username: null }
    )
    expect(reply).toContain('<@u2>')
    expect(reply).toContain('No licenses have this Discord account as a connected member.')
    expect(reply).toContain('Pro role: user not in server.')
  })
})
