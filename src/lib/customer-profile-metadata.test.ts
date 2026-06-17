import { describe, expect, it } from 'vitest'
import {
  getCustomProfileAvatar,
  mergeAccountProfileMetadataPatch,
  projectAccountProfileForReceipt,
  projectProfileMetadataForClient,
  readAccountProfileMetadata,
} from './customer-profile-metadata'

describe('customer profile metadata', () => {
  it('reads account_profile with client defaults and ignores non-string fields', () => {
    expect(
      readAccountProfileMetadata({
        account_profile: {
          avatarDataUrl: 'data:image/png;base64,AAAA',
          avatarUrl: 123,
          countryCode: '',
          addressLine1: '123 Main St',
          addressLine2: null,
          city: 'Austin',
          region: 'TX',
          postalCode: '78701',
          taxNumber: false,
        },
      })
    ).toEqual({
      avatarDataUrl: 'data:image/png;base64,AAAA',
      avatarUrl: '',
      countryCode: 'US',
      addressLine1: '123 Main St',
      addressLine2: '',
      city: 'Austin',
      region: 'TX',
      postalCode: '78701',
      taxNumber: '',
    })
  })

  it('merges a normalized account profile patch without dropping unrelated metadata', () => {
    expect(
      mergeAccountProfileMetadataPatch(
        {
          oauth_avatar_url: 'https://avatars.example.com/oauth.jpg',
          private_flag: true,
          account_profile: {
            legacyField: 'keep me',
            addressLine2: 'Old suite',
            taxNumber: 'OLD',
          },
        },
        {
          avatarDataUrl: ' data:image/png;base64,AAAA ',
          avatarUrl: '',
          countryCode: ' US ',
          addressLine1: ' 123 Main St ',
          addressLine2: null,
          city: ' Austin ',
          region: ' TX ',
          postalCode: ' 78701 ',
          taxNumber: undefined,
          ignored: 'nope',
        }
      )
    ).toEqual({
      oauth_avatar_url: 'https://avatars.example.com/oauth.jpg',
      private_flag: true,
      account_profile: {
        legacyField: 'keep me',
        addressLine2: null,
        taxNumber: 'OLD',
        avatarDataUrl: 'data:image/png;base64,AAAA',
        avatarUrl: null,
        countryCode: 'US',
        addressLine1: '123 Main St',
        city: 'Austin',
        region: 'TX',
        postalCode: '78701',
      },
    })
  })

  it('returns null for a patch that contains no profile fields', () => {
    expect(
      mergeAccountProfileMetadataPatch(
        { marketing_opt_in: true },
        { ignored: 'value' }
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
          countryCode: 'GB',
          addressLine1: '221B Baker St',
          city: 'London',
          secretField: 'do not leak',
        },
      })
    ).toEqual({
      oauth_avatar_url: 'https://avatars.example.com/oauth.jpg',
      avatar_url: 'https://avatars.example.com/avatar.jpg',
      account_profile: {
        avatarDataUrl: 'data:image/png;base64,AAAA',
        avatarUrl: 'https://example.com/custom.png',
        countryCode: 'GB',
        addressLine1: '221B Baker St',
        addressLine2: '',
        city: 'London',
        region: '',
        postalCode: '',
        taxNumber: '',
      },
    })
  })

  it('projects receipt billing fields without inventing form defaults', () => {
    expect(
      projectAccountProfileForReceipt({
        account_profile: {
          countryCode: 'ES',
          addressLine1: 'Carrer de Mallorca',
          addressLine2: '',
          city: 'Barcelona',
          region: 'Catalonia',
          postalCode: '08013',
          taxNumber: 123,
          avatarUrl: 'https://example.com/avatar.png',
        },
      })
    ).toEqual({
      countryCode: 'ES',
      addressLine1: 'Carrer de Mallorca',
      addressLine2: '',
      city: 'Barcelona',
      region: 'Catalonia',
      postalCode: '08013',
      taxNumber: null,
    })

    expect(projectAccountProfileForReceipt({})).toEqual({
      countryCode: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      region: null,
      postalCode: null,
      taxNumber: null,
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
