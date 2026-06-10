import { describe, expect, it } from 'vitest'
import {
  buildDiscordLinkMetadata,
  clearDiscordLinkMetadata,
  getDiscordLink,
} from './metadata'

describe('Discord customer metadata helpers', () => {
  it('reads a complete Discord link from customer metadata', () => {
    expect(
      getDiscordLink({
        discord_user_id: '123',
        discord_username: 'alice',
        discord_avatar: 'avatar_hash',
        discord_linked_at: '2026-06-11T00:00:00.000Z',
      })
    ).toEqual({
      userId: '123',
      username: 'alice',
      avatar: 'avatar_hash',
      linkedAt: '2026-06-11T00:00:00.000Z',
    })
  })

  it('ignores partial metadata without a Discord user ID', () => {
    expect(getDiscordLink({ discord_username: 'alice' })).toBeNull()
  })

  it('preserves unrelated metadata when storing and clearing a link', () => {
    const existing = { account_profile: { city: 'Barcelona' }, discord_user_id: 'old' }
    const linked = buildDiscordLinkMetadata(existing, {
      id: '123',
      username: 'alice',
      avatar: null,
      linkedAt: new Date('2026-06-11T00:00:00.000Z'),
    })

    expect(linked).toEqual({
      account_profile: { city: 'Barcelona' },
      discord_user_id: '123',
      discord_username: 'alice',
      discord_avatar: null,
      discord_linked_at: '2026-06-11T00:00:00.000Z',
    })

    expect(clearDiscordLinkMetadata(linked)).toEqual({
      account_profile: { city: 'Barcelona' },
    })
  })
})
