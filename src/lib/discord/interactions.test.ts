import { describe, expect, it } from 'vitest'
import {
  buildMemberCardEmbed,
  parseDirectoryFooterMemberId,
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

  it('builds the member-card embed with plan pill, holder name, sites and role state', () => {
    const embed = buildMemberCardEmbed(
      {
        licences: [
          {
            keySuffix: '1234',
            status: 'active',
            expiry: '2027-02-16T00:00:00.000Z',
            planId: 'yearly',
            holderEmail: 'owner@example.com',
            holderName: 'Ada Lovelace',
            usedSeats: 2,
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
        ],
        customerSince: '2019-03-05T12:00:00.000Z',
      },
      { id: 'u1', username: 'ada' },
      { roleState: 'has_role' }
    )

    expect(embed.title).toBe('Customer info — @ada')
    expect(embed.description).toContain('Customer since: 2019-03-05')
    expect(embed.description).toContain('Pro role: held.')
    expect(embed.color).toBe(0x5865f2)
    expect(embed.fields[0].name).toBe('****-1234 · Pro Yearly')
    expect(embed.fields[0].value).toContain('active, expires 2027-02-16')
    expect(embed.fields[0].value).toContain('holder owner@example.com (Ada Lovelace)')
    expect(embed.fields[0].value).toContain('seats 2/5 · connected 2026-06-01')
    expect(embed.fields[0].value).toContain('[shop.example.com](https://shop.example.com) — seen 2026-07-01 · plugin 1.9.8')
    expect(embed.footer).toBeUndefined()
  })

  it('never labels a null expiry as lifetime unless the plan registry says so (#526)', () => {
    const migratedExpiredYearly = {
      keySuffix: '9999',
      status: 'expired',
      expiry: null,
      planId: null,
      holderEmail: null,
      holderName: null,
      usedSeats: 1,
      seatCap: 5,
      connectedAt: null,
      sites: [],
    }
    const embed = buildMemberCardEmbed(
      { licences: [migratedExpiredYearly], customerSince: null },
      { id: 'u1', username: 'ada' }
    )
    expect(embed.fields[0].value).toContain('expired, no expiry on record')
    expect(embed.fields[0].value).not.toContain('lifetime')
    expect(embed.fields[0].value).toContain('sites: none activated yet')
    expect(embed.color).toBe(0x80848e)

    const lifetime = buildMemberCardEmbed(
      { licences: [{ ...migratedExpiredYearly, status: 'active', planId: 'lifetime' as const }], customerSince: null },
      { id: 'u1', username: 'ada' }
    )
    expect(lifetime.fields[0].name).toBe('****-9999 · Pro Lifetime')
    expect(lifetime.fields[0].value).toContain('active, lifetime')
    expect(lifetime.color).toBe(0xc9a227)
  })

  it('caps licence fields and reports the omitted count', () => {
    const embed = buildMemberCardEmbed(
      {
        licences: Array.from({ length: 60 }, (_, index) => ({
          keySuffix: String(index).padStart(4, '0'),
          status: 'active',
          expiry: '2027-02-16T00:00:00.000Z',
          planId: 'yearly' as const,
          holderEmail: `owner-${index}@example.com`,
          holderName: null,
          usedSeats: 2,
          seatCap: 5,
          connectedAt: '2026-06-01T00:00:00.000Z',
          sites: [],
        })),
        customerSince: '2019-03-05T12:00:00.000Z',
      },
      { id: 'u1', username: 'ada' }
    )

    expect(embed.fields).toHaveLength(9)
    expect(embed.fields.at(-1)?.value).toBe('…and 52 more licences omitted.')
    // Discord's 6,000-char embed ceiling.
    const totalChars =
      embed.title.length +
      embed.description.length +
      embed.fields.reduce((sum, field) => sum + field.name.length + field.value.length, 0)
    expect(totalChars).toBeLessThanOrEqual(6000)
  })

  it('caps a licence field value at the 1,024-char embed limit', () => {
    const embed = buildMemberCardEmbed(
      {
        licences: [
          {
            keySuffix: '1234',
            status: 'active',
            expiry: null,
            planId: 'lifetime',
            holderEmail: null,
            holderName: null,
            usedSeats: 1,
            seatCap: 5,
            connectedAt: null,
            sites: Array.from({ length: 3 }, (_, index) => ({
              label: `${'x'.repeat(400)}-${index}.example.com`,
              url: null,
              lastSeenAt: null,
              pluginVersion: null,
            })),
          },
        ],
        customerSince: null,
      },
      { id: 'u1', username: 'ada' }
    )
    expect(embed.fields[0].value.length).toBeLessThanOrEqual(1024)
    expect(embed.fields[0].value.endsWith('…')).toBe(true)
  })

  it('builds the no-licences card with a mention fallback for the username', () => {
    const embed = buildMemberCardEmbed(
      { licences: [], customerSince: null },
      { id: 'u2', username: null },
      { roleState: 'not_in_guild' }
    )
    expect(embed.title).toContain('<@u2>')
    expect(embed.description).toContain('No licenses have this Discord account as a connected member.')
    expect(embed.description).toContain('Pro role: user not in server.')
  })

  it('round-trips the directory footer marker', () => {
    const embed = buildMemberCardEmbed(
      { licences: [], customerSince: null },
      { id: '621289187232186378', username: 'kilbot' },
      { directoryFooter: true }
    )
    expect(embed.footer?.text).toBe('member:621289187232186378')
    expect(parseDirectoryFooterMemberId(embed.footer?.text)).toBe('621289187232186378')
    expect(parseDirectoryFooterMemberId('member:not-a-snowflake')).toBeNull()
    expect(parseDirectoryFooterMemberId('unrelated footer')).toBeNull()
    expect(parseDirectoryFooterMemberId(undefined)).toBeNull()
  })
})
