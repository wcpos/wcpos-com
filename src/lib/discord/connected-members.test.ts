import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DISCORD_SEAT_CAP,
  addConnectedDiscordMember,
  getConnectedDiscordAccess,
  removeConnectedDiscordMember,
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
})
