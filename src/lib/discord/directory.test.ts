import { describe, expect, it, vi } from 'vitest'
import type { LicenseDetail } from '@/types/license'
import { addConnectedDiscordMember } from './connected-members'
import { buildMemberCardEmbed, type DiscordCustomerInfo } from './interactions'
import {
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
  })

  it('does not edit an existing card when its rendered embed is unchanged', async () => {
    const existingCard = {
      id: 'msg_existing',
      memberId: '111',
      embed: buildMemberCardEmbed(
        emptyCard,
        { id: '111', username: 'ada' },
        { directoryFooter: true }
      ),
    }
    const deps = dependencies({
      listAllLicenses: async () => [license({ metadata: connectedTo({}, '111') })],
      listDirectoryMessages: async () => [existingCard],
      getDirectoryMessage: async () => existingCard,
    })

    const summary = await syncMemberDirectory(deps)

    expect(deps.editDirectoryCard).not.toHaveBeenCalled()
    expect(summary).toEqual({ members: 1, created: 0, updated: 0, deleted: 0 })
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

    expect(summary).toEqual({ members: 2, created: 1, updated: 1, deleted: 1 })
    expect(deps.editDirectoryCard).toHaveBeenCalledWith(
      'msg_existing',
      expect.objectContaining({ footer: { text: 'member:111' } })
    )
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
    expect(deps.editDirectoryCard).toHaveBeenCalledWith('msg_first', expect.anything())
    expect(summary).toEqual({ members: 1, created: 0, updated: 1, deleted: 1 })
  })
})

describe('upsertDirectoryCardForMember', () => {
  it('does not edit an existing card when its rendered embed is unchanged', async () => {
    const existingCard = {
      id: 'msg_1',
      memberId: '111',
      embed: buildMemberCardEmbed(
        emptyCard,
        { id: '111', username: 'ada' },
        { directoryFooter: true }
      ),
    }
    const deps = dependencies({
      listAllLicenses: async () => [license({ metadata: connectedTo({}, '111') })],
      listDirectoryMessages: async () => [existingCard],
    })

    await upsertDirectoryCardForMember('111', deps)

    expect(deps.editDirectoryCard).not.toHaveBeenCalled()
  })

  it('creates a card for a newly linked member', async () => {
    const deps = dependencies({
      listAllLicenses: async () => [license({ metadata: connectedTo({}, '111') })],
    })
    await upsertDirectoryCardForMember('111', deps)
    expect(deps.createDirectoryCard).toHaveBeenCalledOnce()
    expect(deps.editDirectoryCard).not.toHaveBeenCalled()
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
    expect(deps.editDirectoryCard).toHaveBeenCalledWith('msg_first', expect.anything())
    expect(deps.createDirectoryCard).not.toHaveBeenCalled()
  })

  it('edits the existing card in place', async () => {
    const deps = dependencies({
      listAllLicenses: async () => [license({ metadata: connectedTo({}, '111') })],
      listDirectoryMessages: async () => [{ id: 'msg_1', memberId: '111' }],
    })
    await upsertDirectoryCardForMember('111', deps)
    expect(deps.editDirectoryCard).toHaveBeenCalledWith('msg_1', expect.anything())
    expect(deps.createDirectoryCard).not.toHaveBeenCalled()
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
