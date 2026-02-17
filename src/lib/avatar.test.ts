import { describe, expect, it } from 'vitest'
import {
  getConnectedAvatarUrlFromMetadata,
  getConnectedAvatarUrlFromUserMetadata,
} from './avatar'

describe('avatar helpers', () => {
  it('extracts avatar URLs from nested metadata', () => {
    const avatarUrl = getConnectedAvatarUrlFromMetadata({
      oauth_profile: {
        avatar_url: 'https://avatars.example.com/connected.png',
      },
    })

    expect(avatarUrl).toBe('https://avatars.example.com/connected.png')
  })

  it('extracts avatar URL from OAuth user metadata', () => {
    const avatarUrl = getConnectedAvatarUrlFromUserMetadata({
      avatar_url: 'https://avatars.example.com/oauth.png',
      email: 'user@example.com',
    })

    expect(avatarUrl).toBe('https://avatars.example.com/oauth.png')
  })
})
