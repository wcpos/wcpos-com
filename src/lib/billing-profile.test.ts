import { describe, it, expect } from 'vitest'
import {
  billingPrefillFromCustomer,
  profilePatchFromBillingAddress,
} from './billing-profile'

describe('billingPrefillFromCustomer', () => {
  const base = {
    first_name: 'Paul',
    last_name: 'K',
    metadata: {
        account_profile: {
          countryCode: 'AU',
          addressLine1: '1 Example St',
          addressLine2: 'Unit 4',
          city: 'Perth',
          region: 'WA',
          postalCode: '6000',
          taxNumber: '51 824 753 556',
        },
    },
  }

  it('maps a saved profile to a billing prefill', () => {
    expect(billingPrefillFromCustomer(base)).toEqual({
      address: {
        first_name: 'Paul',
        last_name: 'K',
        address_1: '1 Example St',
        address_2: 'Unit 4',
        city: 'Perth',
        province: 'WA',
        postal_code: '6000',
        country_code: 'au',
      },
      taxNumber: '51 824 753 556',
    })
  })

  it('returns no address when nothing address-like is saved', () => {
    expect(
      billingPrefillFromCustomer({ metadata: { account_profile: {} } })
    ).toEqual({ address: null, taxNumber: undefined })
  })

  it('does not assert a country the customer never saved (reader defaults to US)', () => {
    const prefill = billingPrefillFromCustomer({
      metadata: { account_profile: { addressLine1: '1 Example St' } },
    })
    expect(prefill.address?.country_code).toBe('us')
  })

  it('preserves a saved worldwide country in the checkout country list', () => {
    const prefill = billingPrefillFromCustomer({
      metadata: {
        account_profile: { countryCode: 'PL', addressLine1: 'ul. Prosta 1' },
      },
    })
    expect(prefill.address?.country_code).toBe('pl')
  })
})

describe('profilePatchFromBillingAddress', () => {
  const address = {
    first_name: 'Ada',
    last_name: 'Lovelace',
    address_1: '42 Wallaby Way',
    address_2: 'Apt 7',
    city: 'Sydney',
    province: 'NSW',
    postal_code: '2000',
    country_code: 'au',
  }

  it('projects the owned fields and uppercases the country', () => {
    expect(profilePatchFromBillingAddress(address, 'abn-1')).toEqual({
      countryCode: 'AU',
      addressLine1: '42 Wallaby Way',
      addressLine2: 'Apt 7',
      city: 'Sydney',
      region: 'NSW',
      postalCode: '2000',
      taxNumber: 'abn-1',
    })
  })

  it('passes an explicit empty tax number through so the merge clears it', () => {
    expect(profilePatchFromBillingAddress(address, '').taxNumber).toBe('')
  })

  it('omits the tax number entirely when it was not submitted', () => {
    expect(
      profilePatchFromBillingAddress(address, undefined).taxNumber
    ).toBeUndefined()
  })

  it('does not clear required address fields when they are submitted empty', () => {
    const patch = profilePatchFromBillingAddress(
      { ...address, city: '  ', address_1: '', address_2: '', province: '  ' },
      undefined
    )
    expect(patch.city).toBeUndefined()
    expect(patch.addressLine1).toBeUndefined()
  })

  it('clears submitted optional address fields when they are empty', () => {
    const patch = profilePatchFromBillingAddress(
      { ...address, address_2: '', province: '  ', postal_code: '' },
      undefined
    )
    expect(patch.addressLine2).toBeNull()
    expect(patch.region).toBeNull()
    expect(patch.postalCode).toBeNull()
  })

  it('preserves optional address fields when checkout omits them', () => {
    const patch = profilePatchFromBillingAddress(
      {
        first_name: address.first_name,
        last_name: address.last_name,
        address_1: address.address_1,
        city: address.city,
        country_code: address.country_code,
      },
      undefined
    )

    expect(patch.addressLine2).toBeUndefined()
    expect(patch.region).toBeUndefined()
    expect(patch.postalCode).toBeUndefined()
  })
})
