import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DISCORD_SEAT_CAP,
  addConnectedDiscordMember,
  getBlockedDiscordMembers,
  getConnectedDiscordAccess,
  removeConnectedDiscordMember,
  unblockDiscordUserForLicence,
} from './connected-members'

const now = new Date('2026-06-17T10:00:00.000Z')

describe('connected Discord member metadata', () => {
  it('returns an empty access record with the default seat cap when metadata is absent', () => {
    expect(getConnectedDiscordAccess({})).toEqual({
      seatCap: DEFAULT_DISCORD_SEAT_CAP,
      members: [],
      blockedDiscordUserIds: [],
    })
  })

  it('parses active members and hides removed members from the holder view', () => {
    expect(
      getConnectedDiscordAccess({
        discord_access: {
          seatCap: 3,
          blockedDiscordUserIds: ['discord_removed'],
          members: [
            {
              id: 'member_active',
              discordUserId: 'discord_active',
              username: 'ada',
              avatar: 'avatar_hash',
              connectedAt: '2026-06-01T00:00:00.000Z',
            },
            {
              id: 'member_removed',
              discordUserId: 'discord_removed',
              username: 'devon',
              avatar: null,
              connectedAt: '2026-06-02T00:00:00.000Z',
              removedAt: '2026-06-03T00:00:00.000Z',
            },
          ],
        },
      })
    ).toEqual({
      seatCap: 3,
      blockedDiscordUserIds: ['discord_removed'],
      members: [
        {
          id: 'member_active',
          discordUserId: 'discord_active',
          username: 'ada',
          avatar: 'avatar_hash',
          connectedAt: '2026-06-01T00:00:00.000Z',
        },
      ],
    })
  })

  it('adds a member without overwriting unrelated license metadata', () => {
    const updated = addConnectedDiscordMember(
      { plan_note: 'keep me' },
      {
        id: 'discord_1',
        username: 'ada',
        avatar: null,
        connectedAt: now,
      }
    )

    expect(updated).toEqual({
      plan_note: 'keep me',
      discord_access: {
        seatCap: DEFAULT_DISCORD_SEAT_CAP,
        blockedDiscordUserIds: [],
        members: [
          {
            id: 'discord-member-discord_1',
            discordUserId: 'discord_1',
            username: 'ada',
            avatar: null,
            connectedAt: '2026-06-17T10:00:00.000Z',
          },
        ],
      },
    })
  })

  it('marks a removed member and blocks the same Discord user id for that licence', () => {
    const metadata = addConnectedDiscordMember({}, {
      id: 'discord_1',
      username: 'ada',
      avatar: null,
      connectedAt: now,
    })

    const removed = removeConnectedDiscordMember(
      metadata,
      'discord-member-discord_1',
      new Date('2026-06-18T00:00:00.000Z')
    )

    expect(getConnectedDiscordAccess(removed)).toEqual({
      seatCap: DEFAULT_DISCORD_SEAT_CAP,
      members: [],
      blockedDiscordUserIds: ['discord_1'],
    })
    expect((removed.discord_access as { members: Array<{ removedAt?: string }> }).members[0].removedAt).toBe(
      '2026-06-18T00:00:00.000Z'
    )
  })

  it('frees the seat without block-listing when removal is a self-unlink (block: false)', () => {
    const metadata = addConnectedDiscordMember({}, {
      id: 'discord_1',
      username: 'ada',
      avatar: null,
      connectedAt: now,
    })

    const removed = removeConnectedDiscordMember(
      metadata,
      'discord-member-discord_1',
      new Date('2026-06-18T00:00:00.000Z'),
      { block: false }
    )

    expect(getConnectedDiscordAccess(removed)).toEqual({
      seatCap: DEFAULT_DISCORD_SEAT_CAP,
      members: [],
      blockedDiscordUserIds: [],
    })
  })

  it('joins blocked ids with their removed-member history for the holder view', () => {
    const metadata = removeConnectedDiscordMember(
      addConnectedDiscordMember({}, {
        id: 'discord_1',
        username: 'ada',
        avatar: 'avatar_hash',
        connectedAt: now,
      }),
      'discord-member-discord_1',
      new Date('2026-06-18T00:00:00.000Z')
    )

    expect(getBlockedDiscordMembers(metadata)).toEqual([
      {
        discordUserId: 'discord_1',
        username: 'ada',
        avatar: 'avatar_hash',
        removedAt: '2026-06-18T00:00:00.000Z',
      },
    ])
  })

  it('returns a bare blocked entry when no member record backs the blocked id', () => {
    expect(
      getBlockedDiscordMembers({
        discord_access: { blockedDiscordUserIds: ['discord_orphan'], members: [] },
      })
    ).toEqual([
      { discordUserId: 'discord_orphan', username: null, avatar: null, removedAt: null },
    ])
  })

  it('unblocks a Discord user without touching member history or other blocks', () => {
    const blockedBoth = removeConnectedDiscordMember(
      removeConnectedDiscordMember(
        addConnectedDiscordMember(
          addConnectedDiscordMember({ plan_note: 'keep me' }, {
            id: 'discord_1',
            username: 'ada',
            avatar: null,
            connectedAt: now,
          }),
          { id: 'discord_2', username: 'devon', avatar: null, connectedAt: now }
        ),
        'discord-member-discord_1',
        new Date('2026-06-18T00:00:00.000Z')
      ),
      'discord-member-discord_2',
      new Date('2026-06-19T00:00:00.000Z')
    )

    const unblocked = unblockDiscordUserForLicence(blockedBoth, 'discord_1')

    expect(unblocked.plan_note).toBe('keep me')
    expect(getConnectedDiscordAccess(unblocked).blockedDiscordUserIds).toEqual(['discord_2'])
    // The removed-member records stay as history; unblocking only lifts the block.
    expect(
      (unblocked.discord_access as { members: Array<{ removedAt?: string }> }).members
    ).toHaveLength(2)
  })

  it('leaves metadata unchanged in shape when unblocking an id that is not blocked', () => {
    const metadata = addConnectedDiscordMember({}, {
      id: 'discord_1',
      username: 'ada',
      avatar: null,
      connectedAt: now,
    })

    const unblocked = unblockDiscordUserForLicence(metadata, 'discord_other')

    expect(getConnectedDiscordAccess(unblocked)).toEqual(getConnectedDiscordAccess(metadata))
  })
})
