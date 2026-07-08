import { describe, expect, it } from 'vitest'
import {
  getCustomProfileAvatar,
  mergeAccountProfileMetadataPatch,
  projectProfileMetadataForClient,
  readAccountProfileMetadata,
} from './customer-profile-metadata'

describe('customer profile metadata', () => {
  it('reads avatar fields and ignores non-string values', () => {
    expect(
      readAccountProfileMetadata({
        account_profile: {
          avatarDataUrl: 'data:image/png;base64,AAAA',
          avatarUrl: 123,
        },
      })
    ).toEqual({
      avatarDataUrl: 'data:image/png;base64,AAAA',
      avatarUrl: '',
    })
  })

  it('merges a normalized avatar patch without dropping unrelated metadata', () => {
    expect(
      mergeAccountProfileMetadataPatch(
        {
          oauth_avatar_url: 'https://avatars.example.com/oauth.jpg',
          private_flag: true,
          account_profile: {
            legacyField: 'keep me',
            avatarUrl: 'https://example.com/old.png',
          },
        },
        {
          avatarDataUrl: ' data:image/png;base64,AAAA ',
          avatarUrl: '',
          ignored: 'nope',
        }
      )
    ).toEqual({
      oauth_avatar_url: 'https://avatars.example.com/oauth.jpg',
      private_flag: true,
      account_profile: {
        legacyField: 'keep me',
        avatarDataUrl: 'data:image/png;base64,AAAA',
        avatarUrl: null,
      },
    })
  })

  it('drops stale billing fields left over from the metadata era', () => {
    // Billing details moved to the default billing customer address
    // (billing-profile.ts); saves converge old metadata by removing them.
    expect(
      mergeAccountProfileMetadataPatch(
        {
          account_profile: {
            countryCode: 'AU',
            addressLine1: '1 Example St',
            city: 'Perth',
            taxNumber: 'OLD',
            legacyField: 'keep me',
          },
        },
        { avatarUrl: 'https://example.com/custom.png' }
      )
    ).toEqual({
      account_profile: {
        legacyField: 'keep me',
        avatarUrl: 'https://example.com/custom.png',
      },
    })
  })

  it('returns null for a patch that contains no avatar fields', () => {
    expect(
      mergeAccountProfileMetadataPatch(
        { marketing_opt_in: true },
        { ignored: 'value', countryCode: 'US' }
      )
    ).toBeNull()
  })

  it('projects only client-safe profile metadata', () => {
    expect(
      projectProfileMetadataForClient({
        oauth_avatar_url: 'https://avatars.example.com/oauth.jpg',
        avatar_url: 'https://avatars.example.com/avatar.jpg',
        discord_user_id: 'secret-discord-id',
        marketing_opt_in: true,
        account_profile: {
          avatarDataUrl: 'data:image/png;base64,AAAA',
          avatarUrl: 'https://example.com/custom.png',
          secretField: 'do not leak',
        },
      })
    ).toEqual({
      oauth_avatar_url: 'https://avatars.example.com/oauth.jpg',
      avatar_url: 'https://avatars.example.com/avatar.jpg',
      account_profile: {
        avatarDataUrl: 'data:image/png;base64,AAAA',
        avatarUrl: 'https://example.com/custom.png',
      },
    })
  })

  it('reads only custom avatar fields from account_profile', () => {
    expect(
      getCustomProfileAvatar({
        account_profile: {
          avatarDataUrl: 'data:image/png;base64,AAAA',
          avatarUrl: 'https://example.com/custom.png',
        },
      })
    ).toEqual({
      avatarDataUrl: 'data:image/png;base64,AAAA',
      avatarUrl: 'https://example.com/custom.png',
    })
  })
})
