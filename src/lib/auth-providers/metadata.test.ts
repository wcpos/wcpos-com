import { describe, it, expect } from 'vitest'
import {
  getLinkedAuthProviders,
  addAuthProviderToMetadata,
  recordSignInProvider,
  getPrimarySignInProvider,
} from './metadata'

describe('getLinkedAuthProviders', () => {
  it('returns providers from the persisted auth_providers list, in stable order', () => {
    expect(
      getLinkedAuthProviders({ auth_providers: ['github', 'google'] })
    ).toEqual(['google', 'github'])
  })

  it('ignores unknown entries and non-arrays', () => {
    expect(
      getLinkedAuthProviders({ auth_providers: ['google', 'twitter', 42] })
    ).toEqual(['google'])
    expect(getLinkedAuthProviders({ auth_providers: 'google' })).toEqual([])
  })

  it('falls back to the avatar host for legacy customers without auth_providers', () => {
    expect(
      getLinkedAuthProviders({
        oauth_avatar_url: 'https://lh3.googleusercontent.com/a/abc',
      })
    ).toEqual(['google'])
    expect(
      getLinkedAuthProviders({
        oauth_avatar_url: 'https://avatars.githubusercontent.com/u/1',
      })
    ).toEqual(['github'])
  })

  it('prefers the persisted list over the avatar fallback', () => {
    expect(
      getLinkedAuthProviders({
        auth_providers: ['github'],
        oauth_avatar_url: 'https://lh3.googleusercontent.com/a/abc',
      })
    ).toEqual(['github'])
  })

  it('returns empty for email/password customers (no signal)', () => {
    expect(getLinkedAuthProviders({})).toEqual([])
    expect(getLinkedAuthProviders(null)).toEqual([])
    expect(getLinkedAuthProviders(undefined)).toEqual([])
    expect(
      getLinkedAuthProviders({ oauth_avatar_url: 'https://example.com/a.png' })
    ).toEqual([])
  })
})

describe('addAuthProviderToMetadata', () => {
  it('appends a provider, preserving other metadata', () => {
    expect(
      addAuthProviderToMetadata({ oauth_avatar_url: 'x' }, 'google')
    ).toEqual({ oauth_avatar_url: 'x', auth_providers: ['google'] })
  })

  it('dedupes and keeps insertion order', () => {
    const once = addAuthProviderToMetadata({}, 'google')
    const twice = addAuthProviderToMetadata(once, 'google')
    const added = addAuthProviderToMetadata(twice, 'github')
    expect(twice.auth_providers).toEqual(['google'])
    expect(added.auth_providers).toEqual(['google', 'github'])
  })

  it('recovers from a non-array auth_providers value', () => {
    expect(
      addAuthProviderToMetadata({ auth_providers: 'corrupt' }, 'google')
    ).toEqual({ auth_providers: ['google'] })
  })

  it('does not mutate the input metadata', () => {
    const input = { auth_providers: ['google'] }
    addAuthProviderToMetadata(input, 'github')
    expect(input.auth_providers).toEqual(['google'])
  })

  it('ignores an unknown provider', () => {
    expect(addAuthProviderToMetadata({}, 'twitter')).toEqual({})
  })

  it('drops unknown entries already present in the list', () => {
    expect(
      addAuthProviderToMetadata(
        { auth_providers: ['google', 'bogus'] },
        'github'
      )
    ).toEqual({ auth_providers: ['google', 'github'] })
  })
})

describe('recordSignInProvider', () => {
  it('adds the provider and marks it as the most recent', () => {
    expect(recordSignInProvider({}, 'github')).toEqual({
      auth_providers: ['github'],
      last_sign_in_provider: 'github',
    })
  })

  it('updates last_sign_in_provider each sign-in while keeping the set', () => {
    const first = recordSignInProvider({}, 'google')
    const second = recordSignInProvider(first, 'github')
    expect(second).toEqual({
      auth_providers: ['google', 'github'],
      last_sign_in_provider: 'github',
    })
  })

  it('ignores an unknown provider', () => {
    expect(recordSignInProvider({}, 'twitter')).toEqual({})
  })
})

describe('getPrimarySignInProvider', () => {
  it('prefers the most recent Google/GitHub sign-in', () => {
    expect(
      getPrimarySignInProvider({
        auth_providers: ['google', 'github'],
        last_sign_in_provider: 'github',
      })
    ).toBe('github')
  })

  it('falls back to the first linked Google/GitHub without a recency marker', () => {
    expect(
      getPrimarySignInProvider({ auth_providers: ['github', 'google'] })
    ).toBe('google')
  })

  it('ignores a non-display recent provider (discord) and uses the linked set', () => {
    expect(
      getPrimarySignInProvider({
        auth_providers: ['google', 'discord'],
        last_sign_in_provider: 'discord',
      })
    ).toBe('google')
  })

  it('returns null for email/password or discord-only (no display provider)', () => {
    expect(getPrimarySignInProvider({})).toBeNull()
    expect(
      getPrimarySignInProvider({ last_sign_in_provider: 'discord' })
    ).toBeNull()
  })
})
