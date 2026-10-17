import { describe, expect, it, vi } from 'vitest'
import type { LicenseDetail } from '@/types/license'
import { addConnectedDiscordMember } from './connected-members'
import {
  buildMemberCardEmbed,
  type DiscordCustomerInfo,
  type DiscordCustomerLicenceInfo,
} from './interactions'
import {
  directoryCardDiff,
  listLinkedMembers,
  parseDirectoryMessage,
  syncMemberDirectory,
  upsertDirectoryCardForMember,
  type DiscordDirectoryDependencies,
} from './directory'

function license(overrides: Partial<LicenseDetail> = {}): Omit<LicenseDetail, 'machines'> {
  return {
    id: 'lic_1',
    key: 'WCPOS-AAAA-1234',
    status: 'active',
    expiry: null,
    maxMachines: 5,
    activationCount: 0,
    metadata: {},
    policyId: 'policy_1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function connectedTo(metadata: Record<string, unknown>, discordUserId: string, username = 'ada') {
  return addConnectedDiscordMember(metadata, {
    id: discordUserId,
    username,
    avatar: null,
    connectedAt: new Date('2026-06-01T00:00:00.000Z'),
  })
}

const emptyCard: Omit<DiscordCustomerInfo, 'roleState'> = { licences: [], customerSince: null }

const directoryOptions = { directoryFooter: true, omitSiteActivity: true }

function licenceInfo(
  overrides: Partial<DiscordCustomerLicenceInfo> = {}
): DiscordCustomerLicenceInfo {
  return {
    keySuffix: '1234',
    status: 'active',
    expiry: null,
    planId: null,
    holderEmail: 'owner@example.com',
    holderName: 'Ada Lovelace',
    usedSeats: 1,
    seatCap: 5,
    connectedAt: '2026-06-01T00:00:00.000Z',
    sites: [{ label: 'a.example', url: null, lastSeenAt: '2026-07-01T00:00:00.000Z', pluginVersion: null }],
    ...overrides,
  }
}

function dependencies(
  overrides: Partial<DiscordDirectoryDependencies> = {}
): DiscordDirectoryDependencies {
  return {
    listAllLicenses: async () => [],
    assembleCard: vi.fn(async () => emptyCard),
    listDirectoryMessages: async () => [],
    createDirectoryCard: vi.fn(async () => {}),
    editDirectoryCard: vi.fn(async () => {}),
    deleteDirectoryCard: vi.fn(async () => {}),
    ...overrides,
  }
}

describe('directoryCardDiff', () => {
  it('names the differing parts without their values', () => {
    const card = { licences: [licenceInfo()], customerSince: null }
    const embed = buildMemberCardEmbed(card, { id: '111', username: 'ada' }, directoryOptions)

    expect(directoryCardDiff(null, embed)).toEqual(['card'])
    expect(directoryCardDiff(undefined, embed)).toEqual(['card'])
    expect(directoryCardDiff({ ...embed, title: 'Stale card' }, embed)).toEqual(['title'])
    expect(directoryCardDiff({ ...embed, fields: [] }, embed)).toEqual(['****-1234: added'])

    const changed = buildMemberCardEmbed(
      {
        licences: [
          licenceInfo({
            holderName: 'Grace Hopper',
            sites: [{ label: 'b.example', url: null, lastSeenAt: '2026-07-01T00:00:00.000Z', pluginVersion: null }],
          }),
        ],
        customerSince: null,
      },
      { id: '111', username: 'ada' },
      directoryOptions
    )
    const diff = directoryCardDiff(embed, changed)
    expect(diff).toEqual(['****-1234: holder/sites'])
    expect(diff.join(' ')).not.toMatch(/Hopper|Lovelace|example/)
  })
})

describe('parseDirectoryMessage', () => {
  it('reads the member id from the first embed footer and retains the embed', () => {
    expect(
      parseDirectoryMessage({ id: 'm1', embeds: [{ footer: { text: 'member:123' } }] })
    ).toEqual({
      id: 'm1',
      memberId: '123',
      embed: { footer: { text: 'member:123' } },
    })
    expect(parseDirectoryMessage({ id: 'm2', embeds: [{ footer: { text: 'welcome!' } }] })).toEqual(
      { id: 'm2', memberId: null, embed: { footer: { text: 'welcome!' } } }
    )
    expect(parseDirectoryMessage({ id: 'm3' })).toEqual({ id: 'm3', memberId: null, embed: null })
  })
})

describe('listLinkedMembers', () => {
  it('dedupes members across licences, preferring a non-null username snapshot', () => {
    const members = listLinkedMembers([
      license({ id: 'a', metadata: connectedTo({}, '111', null as unknown as string) }),
      license({ id: 'b', metadata: connectedTo({}, '111', 'ada') }),
      license({ id: 'c', metadata: connectedTo({}, '222', 'bob') }),
    ])
    expect(members).toHaveLength(2)
    expect(members.find((member) => member.discordUserId === '111')?.username).toBe('ada')
  })
})

describe('syncMemberDirectory', () => {
  it('refreshes the live card before skipping an unchanged list snapshot', async () => {
    const expectedEmbed = buildMemberCardEmbed(emptyCard, { id: '111', username: 'ada' }, {
      directoryFooter: true,
      omitSiteActivity: true,
    })
    const existingCard = { id: 'msg_existing', memberId: '111', embed: expectedEmbed }
    const deps = dependencies({
      listAllLicenses: async () => [license({ metadata: connectedTo({}, '111') })],
      listDirectoryMessages: async () => [existingCard],
      getDirectoryMessage: async () => ({
        ...existingCard,
        embed: { ...expectedEmbed, title: 'Stale card' },
      }),
    })

    await syncMemberDirectory(deps)

    expect(deps.editDirectoryCard).toHaveBeenCalledWith('msg_existing', expectedEmbed)
    expect(deps.createDirectoryCard).not.toHaveBeenCalled()
    expect(deps.deleteDirectoryCard).not.toHaveBeenCalled()
  })

  it('does not edit an existing card when its rendered embed is unchanged', async () => {
    const existingCard = {
      id: 'msg_existing',
      memberId: '111',
      embed: buildMemberCardEmbed(
        emptyCard,
        { id: '111', username: 'ada' },
        { directoryFooter: true, omitSiteActivity: true }
      ),
    }
    const deps = dependencies({
      listAllLicenses: async () => [license({ metadata: connectedTo({}, '111') })],
      listDirectoryMessages: async () => [existingCard],
      getDirectoryMessage: async () => existingCard,
    })

    const summary = await syncMemberDirectory(deps)

    expect(deps.createDirectoryCard).not.toHaveBeenCalled()
    expect(deps.editDirectoryCard).not.toHaveBeenCalled()
    expect(deps.deleteDirectoryCard).not.toHaveBeenCalled()
    expect(summary).toEqual({ members: 1, created: 0, updated: 0, deleted: 0, failed: 0 })
  })

  it('creates missing cards, updates existing ones, deletes orphans, leaves non-cards alone', async () => {
    const deps = dependencies({
      listAllLicenses: async () => [
        license({ id: 'a', metadata: connectedTo({}, '111') }),
        license({ id: 'b', metadata: connectedTo({}, '222', 'bob') }),
      ],
      listDirectoryMessages: async () => [
        { id: 'msg_existing', memberId: '111' },
        { id: 'msg_orphan', memberId: '999' },
        { id: 'msg_intro', memberId: null },
      ],
    })

    const summary = await syncMemberDirectory(deps)

    expect(summary).toEqual({ members: 2, created: 1, updated: 1, deleted: 1, failed: 0 })
    expect(deps.editDirectoryCard).toHaveBeenCalledWith(
      'msg_existing',
      expect.objectContaining({ footer: { text: 'member:111' } })
    )
    expect(deps.createDirectoryCard).toHaveBeenCalledOnce()
    expect(deps.createDirectoryCard).toHaveBeenCalledWith(
      expect.objectContaining({ footer: { text: 'member:222' } })
    )
    expect(deps.deleteDirectoryCard).toHaveBeenCalledWith('msg_orphan')
    expect(deps.deleteDirectoryCard).toHaveBeenCalledTimes(1)
  })

  it('deletes duplicate cards for the same member, keeping the first', async () => {
    const deps = dependencies({
      listAllLicenses: async () => [license({ metadata: connectedTo({}, '111') })],
      listDirectoryMessages: async () => [
        { id: 'msg_first', memberId: '111' },
        { id: 'msg_duplicate', memberId: '111' },
      ],
    })

    const summary = await syncMemberDirectory(deps)

    expect(deps.deleteDirectoryCard).toHaveBeenCalledWith('msg_duplicate')
    expect(deps.deleteDirectoryCard).toHaveBeenCalledOnce()
    expect(deps.editDirectoryCard).toHaveBeenCalledWith(
      'msg_first',
      expect.objectContaining({ footer: { text: 'member:111' } })
    )
    expect(deps.createDirectoryCard).not.toHaveBeenCalled()
    expect(summary).toEqual({ members: 1, created: 0, updated: 1, deleted: 1, failed: 0 })
  })

  it('continues after an edit failure and still processes later members and orphans', async () => {
    const failure = new Error('Discord unavailable')
    const reportFailure = vi.fn()
    const deps = dependencies({
      listAllLicenses: async () => [
        license({ id: 'a', metadata: connectedTo({}, '111') }),
        license({ id: 'b', metadata: connectedTo({}, '222', 'bob') }),
      ],
      listDirectoryMessages: async () => [
        { id: 'msg_existing', memberId: '111' },
        { id: 'msg_orphan', memberId: '999' },
      ],
      editDirectoryCard: vi.fn().mockRejectedValueOnce(failure).mockResolvedValue(undefined),
      reportFailure,
    })

    const summary = await syncMemberDirectory(deps)

    expect(summary).toEqual({ members: 2, created: 1, updated: 0, deleted: 1, failed: 1 })
    expect(deps.createDirectoryCard).toHaveBeenCalledWith(
      expect.objectContaining({ footer: { text: 'member:222' } })
    )
    expect(deps.deleteDirectoryCard).toHaveBeenCalledWith('msg_orphan')
    expect(deps.deleteDirectoryCard).not.toHaveBeenCalledWith('msg_existing')
    expect(reportFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        discordUserId: '111',
        messageId: 'msg_existing',
        operation: 'edit',
        error: failure,
      })
    )
  })

  it('contains a throwing failure reporter so later members and orphans still process', async () => {
    const reportFailure = vi.fn(() => {
      throw new Error('reporter exploded')
    })
    const deps = dependencies({
      listAllLicenses: async () => [
        license({ id: 'a', metadata: connectedTo({}, '111') }),
        license({ id: 'b', metadata: connectedTo({}, '222', 'bob') }),
      ],
      listDirectoryMessages: async () => [
        { id: 'msg_existing', memberId: '111' },
        { id: 'msg_orphan', memberId: '999' },
      ],
      editDirectoryCard: vi.fn()
        .mockRejectedValueOnce(new Error('Discord unavailable'))
        .mockResolvedValue(undefined),
      reportFailure,
    })

    const summary = await syncMemberDirectory(deps)

    expect(summary).toEqual({ members: 2, created: 1, updated: 0, deleted: 1, failed: 1 })
    expect(deps.createDirectoryCard).toHaveBeenCalledWith(
      expect.objectContaining({ footer: { text: 'member:222' } })
    )
    expect(deps.deleteDirectoryCard).toHaveBeenCalledWith('msg_orphan')
    expect(reportFailure).toHaveBeenCalledTimes(1)
  })

  it('does not require a failure reporter to survive a failed edit', async () => {
    const deps = dependencies({
      listAllLicenses: async () => [license({ metadata: connectedTo({}, '111') })],
      listDirectoryMessages: async () => [{ id: 'msg_existing', memberId: '111' }],
      editDirectoryCard: vi.fn()
        .mockRejectedValueOnce(new Error('Discord unavailable'))
        .mockResolvedValue(undefined),
    })

    await expect(syncMemberDirectory(deps)).resolves.toEqual({
      members: 1,
      created: 0,
      updated: 0,
      deleted: 0,
      failed: 1,
    })
  })

  it('keeps the existing card and reports when enrichment failed', async () => {
    const error = new Error('keygen down')
    const reportFailure = vi.fn()
    const existingEmbed = buildMemberCardEmbed(emptyCard, { id: '111', username: 'ada' }, directoryOptions)
    const deps = dependencies({
      listAllLicenses: async () => [license({ metadata: connectedTo({}, '111') })],
      listDirectoryMessages: async () => [
        { id: 'msg_existing', memberId: '111', embed: { ...existingEmbed, title: 'Stale card' } },
      ],
      assembleCard: vi.fn(async () => ({
        ...emptyCard,
        enrichmentFailures: [{ source: 'keygen' as const, error }],
      })),
      reportFailure,
    })

    const summary = await syncMemberDirectory(deps)

    expect(deps.editDirectoryCard).not.toHaveBeenCalled()
    expect(deps.createDirectoryCard).not.toHaveBeenCalled()
    expect(deps.deleteDirectoryCard).not.toHaveBeenCalled()
    expect(reportFailure).toHaveBeenCalledWith({
      discordUserId: '111',
      messageId: 'msg_existing',
      operation: 'enrich',
      source: 'keygen',
      error,
    })
    expect(summary).toEqual({ members: 1, created: 0, updated: 0, deleted: 0, failed: 1 })
  })

  it('creates a card for a new member even when enrichment failed, and reports it', async () => {
    const error = new Error('medusa down')
    const reportFailure = vi.fn()
    const reportChange = vi.fn()
    const deps = dependencies({
      listAllLicenses: async () => [license({ metadata: connectedTo({}, '111') })],
      assembleCard: vi.fn(async () => ({
        ...emptyCard,
        enrichmentFailures: [{ source: 'medusa' as const, error }],
      })),
      reportFailure,
      reportChange,
    })

    const summary = await syncMemberDirectory(deps)

    expect(deps.createDirectoryCard).toHaveBeenCalledWith(
      expect.objectContaining({ footer: { text: 'member:111' } })
    )
    expect(reportFailure).toHaveBeenCalledWith(
      expect.objectContaining({ discordUserId: '111', operation: 'enrich', source: 'medusa', error })
    )
    expect(reportChange).toHaveBeenCalledWith({ discordUserId: '111', operation: 'create', fields: [] })
    expect(summary).toEqual({ members: 1, created: 1, updated: 0, deleted: 0, failed: 1 })
  })

  it('reports the member id and the differing parts on every edit', async () => {
    const site = (label: string) => ({ label, url: null, lastSeenAt: null, pluginVersion: null })
    const existingEmbed = buildMemberCardEmbed(
      { licences: [licenceInfo({ sites: [site('a.example')] })], customerSince: null },
      { id: '111', username: 'ada' },
      directoryOptions
    )
    const reportChange = vi.fn()
    const deps = dependencies({
      listAllLicenses: async () => [license({ metadata: connectedTo({}, '111') })],
      listDirectoryMessages: async () => [{ id: 'msg_existing', memberId: '111', embed: existingEmbed }],
      assembleCard: vi.fn(async () => ({
        licences: [licenceInfo({ sites: [site('b.example')] })],
        customerSince: null,
      })),
      reportChange,
    })

    await syncMemberDirectory(deps)

    expect(deps.editDirectoryCard).toHaveBeenCalledOnce()
    expect(reportChange).toHaveBeenCalledWith({
      discordUserId: '111',
      messageId: 'msg_existing',
      operation: 'edit',
      fields: ['****-1234: sites'],
    })
  })

  it('nightly dry run over 43 linked members edits only changed cards and never reposts', async () => {
    const ids = Array.from({ length: 43 }, (_, index) => String(1001 + index))
    const cards = ids.map((id, index) => ({
      id: `msg_${index + 1}`,
      memberId: id,
      embed: buildMemberCardEmbed(emptyCard, { id, username: 'ada' }, directoryOptions),
    }))
    const weakerCard = { licences: [licenceInfo({ holderName: null, sites: [] })], customerSince: null }
    const failure = (source: 'medusa' | 'keygen') => ({ source, error: new Error(`${source} down`) })
    const deps = dependencies({
      listAllLicenses: async () =>
        ids.map((id, index) => license({ id: `lic_${index + 1}`, metadata: connectedTo({}, id) })),
      listDirectoryMessages: async () => cards,
      getDirectoryMessage: async (messageId) => cards.find((card) => card.id === messageId) ?? null,
      assembleCard: vi.fn(async (discordUserId: string) => {
        const member = ids.indexOf(discordUserId) + 1
        if (member <= 2) return { licences: [licenceInfo()], customerSince: null }
        if (member === 3) return { ...weakerCard, enrichmentFailures: [failure('medusa')] }
        if (member === 4) return { ...weakerCard, enrichmentFailures: [failure('keygen')] }
        if (member === 5) {
          return { ...weakerCard, enrichmentFailures: [failure('medusa'), failure('keygen')] }
        }
        return emptyCard
      }),
    })

    const summary = await syncMemberDirectory(deps)

    expect(deps.createDirectoryCard).not.toHaveBeenCalled()
    expect(deps.deleteDirectoryCard).not.toHaveBeenCalled()
    expect(deps.editDirectoryCard).toHaveBeenCalledTimes(2)
    expect(vi.mocked(deps.editDirectoryCard).mock.calls.map(([messageId]) => messageId)).toEqual([
      'msg_1',
      'msg_2',
    ])
    expect(summary).toEqual({ members: 43, created: 0, updated: 2, deleted: 0, failed: 4 })
  })
})

describe('upsertDirectoryCardForMember', () => {
  it('does not replace an existing card when its rendered embed is unchanged', async () => {
    const existingCard = {
      id: 'msg_1',
      memberId: '111',
      embed: buildMemberCardEmbed(
        emptyCard,
        { id: '111', username: 'ada' },
        { directoryFooter: true, omitSiteActivity: true }
      ),
    }
    const deps = dependencies({
      listAllLicenses: async () => [license({ metadata: connectedTo({}, '111') })],
      listDirectoryMessages: async () => [existingCard],
    })

    await upsertDirectoryCardForMember('111', deps)

    expect(deps.createDirectoryCard).not.toHaveBeenCalled()
    expect(deps.editDirectoryCard).not.toHaveBeenCalled()
    expect(deps.deleteDirectoryCard).not.toHaveBeenCalled()
  })

  it('creates a card for a newly linked member', async () => {
    const deps = dependencies({
      listAllLicenses: async () => [license({ metadata: connectedTo({}, '111') })],
    })
    await upsertDirectoryCardForMember('111', deps)
    expect(deps.createDirectoryCard).toHaveBeenCalledOnce()
    expect(deps.deleteDirectoryCard).not.toHaveBeenCalled()
  })

  it('deletes duplicate cards at event time, editing the first', async () => {
    const deps = dependencies({
      listAllLicenses: async () => [license({ metadata: connectedTo({}, '111') })],
      listDirectoryMessages: async () => [
        { id: 'msg_first', memberId: '111' },
        { id: 'msg_dup_a', memberId: '111' },
        { id: 'msg_dup_b', memberId: '111' },
      ],
    })
    await upsertDirectoryCardForMember('111', deps)
    expect(deps.deleteDirectoryCard).toHaveBeenCalledWith('msg_dup_a')
    expect(deps.deleteDirectoryCard).toHaveBeenCalledWith('msg_dup_b')
    expect(deps.deleteDirectoryCard).toHaveBeenCalledTimes(2)
    expect(deps.editDirectoryCard).toHaveBeenCalledWith(
      'msg_first',
      expect.objectContaining({ footer: { text: 'member:111' } })
    )
    expect(deps.createDirectoryCard).not.toHaveBeenCalled()
  })

  it('edits the existing card in place', async () => {
    const reportChange = vi.fn()
    const deps = dependencies({
      listAllLicenses: async () => [license({ metadata: connectedTo({}, '111') })],
      listDirectoryMessages: async () => [{ id: 'msg_1', memberId: '111' }],
      reportChange,
    })
    await upsertDirectoryCardForMember('111', deps)
    expect(deps.editDirectoryCard).toHaveBeenCalledWith(
      'msg_1',
      buildMemberCardEmbed(emptyCard, { id: '111', username: 'ada' }, {
        directoryFooter: true,
        omitSiteActivity: true,
      })
    )
    expect(deps.createDirectoryCard).not.toHaveBeenCalled()
    expect(deps.deleteDirectoryCard).not.toHaveBeenCalled()
    expect(reportChange).toHaveBeenCalledWith({
      discordUserId: '111',
      messageId: 'msg_1',
      operation: 'edit',
      fields: ['card'],
    })
  })

  it('keeps the existing card at event time when enrichment failed', async () => {
    const error = new Error('medusa down')
    const reportFailure = vi.fn(() => {
      throw new Error('reporter exploded')
    })
    const deps = dependencies({
      listAllLicenses: async () => [license({ metadata: connectedTo({}, '111') })],
      listDirectoryMessages: async () => [{ id: 'msg_1', memberId: '111' }],
      assembleCard: vi.fn(async () => ({
        ...emptyCard,
        enrichmentFailures: [{ source: 'medusa' as const, error }],
      })),
      reportFailure,
    })
    await expect(upsertDirectoryCardForMember('111', deps)).resolves.toBeUndefined()
    expect(deps.editDirectoryCard).not.toHaveBeenCalled()
    expect(deps.createDirectoryCard).not.toHaveBeenCalled()
    expect(deps.deleteDirectoryCard).not.toHaveBeenCalled()
    expect(reportFailure).toHaveBeenCalledWith({
      discordUserId: '111',
      messageId: 'msg_1',
      operation: 'enrich',
      source: 'medusa',
      error,
    })
  })

  it('deletes the card when no licence links the member any more', async () => {
    const assembleCard = vi.fn()
    const deps = dependencies({
      assembleCard,
      listDirectoryMessages: async () => [{ id: 'msg_1', memberId: '111' }],
    })
    await upsertDirectoryCardForMember('111', deps)
    expect(deps.deleteDirectoryCard).toHaveBeenCalledWith('msg_1')
    expect(assembleCard).not.toHaveBeenCalled()
    expect(deps.createDirectoryCard).not.toHaveBeenCalled()
  })

  it('does nothing for an unlinked member with no card', async () => {
    const deps = dependencies()
    await upsertDirectoryCardForMember('111', deps)
    expect(deps.deleteDirectoryCard).not.toHaveBeenCalled()
    expect(deps.createDirectoryCard).not.toHaveBeenCalled()
  })
})
