import { describe, it, expect } from 'vitest'
import {
  billingDetailsFromAddress,
  billingPatchFromCheckout,
  billingPatchFromProfileForm,
  billingPatchHasAddressContent,
  billingPrefillFromCustomer,
  isCompleteBillingAddress,
  pickDefaultBillingAddress,
  renewalBillingPrefillFromCustomer,
  type MedusaCustomerAddress,
} from './billing-profile'

const savedAddress: MedusaCustomerAddress = {
  id: 'caddr_1',
  first_name: 'Paul',
  last_name: 'K',
  address_1: '1 Example St',
  address_2: 'Unit 4',
  city: 'Perth',
  province: 'WA',
  postal_code: '6000',
  country_code: 'au',
  is_default_billing: true,
  metadata: { tax_number: '51 824 753 556' },
}

describe('isCompleteBillingAddress', () => {
  const completeAddress = {
    first_name: ' Ada ', last_name: ' Lovelace ',
    address_1: ' 42 Wallaby Way ', city: ' Sydney ',
    postal_code: ' 2000 ',
    country_code: ' AU ',
  }

  const cases: Array<[string, unknown, boolean]> = [
    [
      'complete without postal code in a no-postal market',
      { ...completeAddress, postal_code: '', country_code: 'CQ' },
      true,
    ],
    [
      'missing postal code in a required market',
      { ...completeAddress, postal_code: ' ' },
      false,
    ],
    ...['first_name', 'last_name', 'address_1', 'city'].map(
      (field): [string, unknown, boolean] =>
        [`blank ${field}`, { ...completeAddress, [field]: ' ' }, false]
    ),
    ['missing', undefined, false],
    ['malformed country', { ...completeAddress, country_code: 123 }, false],
    ['unsupported country', { ...completeAddress, country_code: 'XX' }, false],
  ]

  it.each(cases)('%s', (_name, address, expected) => {
    expect(isCompleteBillingAddress(address)).toBe(expected)
  })
})

describe('pickDefaultBillingAddress', () => {
  it('prefers the default billing address over earlier entries', () => {
    const other: MedusaCustomerAddress = { id: 'caddr_0' }
    expect(pickDefaultBillingAddress([other, savedAddress])).toBe(savedAddress)
  })

  it('never falls back to an unflagged address — that record is not billing-owned', () => {
    // A shipping or imported address must not become a read source (or,
    // via upsertDefaultBillingAddress, a write target).
    const shipping: MedusaCustomerAddress = {
      id: 'caddr_0',
      is_default_shipping: true,
    }
    expect(pickDefaultBillingAddress([shipping, { id: 'caddr_1' }])).toBeNull()
  })

  it('returns null for a customer without addresses', () => {
    expect(pickDefaultBillingAddress([])).toBeNull()
    expect(pickDefaultBillingAddress(undefined)).toBeNull()
  })
})

describe('billingPatchHasAddressContent', () => {
  it('is false for a country-only patch (the form dropdown default)', () => {
    expect(billingPatchHasAddressContent({ country_code: 'us' })).toBe(false)
  })

  it('is false for a names-only patch', () => {
    expect(
      billingPatchHasAddressContent({ first_name: 'Ada', last_name: 'L' })
    ).toBe(false)
  })

  it('is true when any concrete address field or tax number is present', () => {
    expect(billingPatchHasAddressContent({ city: 'Perth' })).toBe(true)
    expect(billingPatchHasAddressContent({ tax_number: 'abn-1' })).toBe(true)
  })
})

describe('billingDetailsFromAddress', () => {
  it('projects the saved address with an uppercase country', () => {
    expect(billingDetailsFromAddress(savedAddress)).toEqual({
      countryCode: 'AU',
      addressLine1: '1 Example St',
      addressLine2: 'Unit 4',
      city: 'Perth',
      region: 'WA',
      postalCode: '6000',
      taxNumber: '51 824 753 556',
    })
  })

  it('projects empty strings when there is no saved address', () => {
    expect(billingDetailsFromAddress(null)).toEqual({
      countryCode: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      region: '',
      postalCode: '',
      taxNumber: '',
    })
  })
})

describe('billingPrefillFromCustomer', () => {
  it('maps the saved default billing address to a billing prefill', () => {
    expect(
      billingPrefillFromCustomer({ addresses: [savedAddress] })
    ).toEqual({
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

  it('falls back to the customer name when the address has none', () => {
    const prefill = billingPrefillFromCustomer({
      first_name: 'Grace',
      last_name: 'Hopper',
      addresses: [{ ...savedAddress, first_name: null, last_name: null }],
    })
    expect(prefill.address?.first_name).toBe('Grace')
    expect(prefill.address?.last_name).toBe('Hopper')
  })

  it('returns no address when nothing address-like is saved', () => {
    expect(billingPrefillFromCustomer({ addresses: [] })).toEqual({
      address: null,
      taxNumber: undefined,
    })
  })

  it('does not assert a country the customer never saved', () => {
    const prefill = billingPrefillFromCustomer({
      addresses: [
        {
          id: 'caddr_2',
          address_1: '1 Example St',
          country_code: null,
          is_default_billing: true,
        },
      ],
    })
    expect(prefill.address?.country_code).toBe('us')
  })

  it('preserves a saved worldwide country in the checkout country list', () => {
    const prefill = billingPrefillFromCustomer({
      addresses: [
        {
          id: 'caddr_3',
          address_1: 'ul. Prosta 1',
          country_code: 'pl',
          is_default_billing: true,
        },
      ],
    })
    expect(prefill.address?.country_code).toBe('pl')
  })
})

describe('renewalBillingPrefillFromCustomer', () => {
  it('uses only the actual default billing record, with customer-name fallback', () => {
    expect(
      renewalBillingPrefillFromCustomer({
        first_name: 'Grace',
        last_name: 'Hopper',
        addresses: [
          { ...savedAddress, first_name: '   ', last_name: null },
        ],
      })
    ).toEqual({
      address: {
        first_name: 'Grace',
        last_name: 'Hopper',
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

  it.each([
    ['missing address line', { address_1: null }],
    ['missing city', { city: null }],
    ['missing actual country', { country_code: null }],
    ['unsupported actual country', { country_code: 'xx' }],
    ['missing required postal code', { postal_code: null }],
  ])('rejects a default billing record with %s', (_name, patch) => {
    expect(
      renewalBillingPrefillFromCustomer({
        addresses: [{ ...savedAddress, ...patch }],
      }).address
    ).toBeNull()
  })

  it('does not use an unflagged address', () => {
    expect(
      renewalBillingPrefillFromCustomer({
        addresses: [{ ...savedAddress, is_default_billing: false }],
      }).address
    ).toBeNull()
  })

  it('accepts an authoritative address without postal code for a no-postal market', () => {
    expect(
      renewalBillingPrefillFromCustomer({
        addresses: [
          { ...savedAddress, country_code: 'cq', postal_code: null },
        ],
      }).address
    ).toEqual(expect.objectContaining({ country_code: 'cq', postal_code: '' }))
  })
})

describe('billingPatchFromCheckout', () => {
  const address = {
    first_name: 'Ada',
    last_name: 'Lovelace',
    address_1: '42 Wallaby Way',
    address_2: 'Apt 7',
    city: 'Sydney',
    province: 'NSW',
    postal_code: '2000',
    country_code: 'AU',
  }

  it('projects the owned fields and lowercases the country for storage', () => {
    expect(billingPatchFromCheckout(address, 'abn-1')).toEqual({
      first_name: 'Ada',
      last_name: 'Lovelace',
      country_code: 'au',
      address_1: '42 Wallaby Way',
      address_2: 'Apt 7',
      city: 'Sydney',
      province: 'NSW',
      postal_code: '2000',
      tax_number: 'abn-1',
    })
  })

  it('maps an explicit empty tax number to null so the write clears it', () => {
    expect(billingPatchFromCheckout(address, '').tax_number).toBeNull()
  })

  it('omits the tax number entirely when it was not submitted', () => {
    expect(
      billingPatchFromCheckout(address, undefined).tax_number
    ).toBeUndefined()
  })

  it('does not clear required address fields when they are submitted empty', () => {
    const patch = billingPatchFromCheckout(
      { ...address, city: '  ', address_1: '' },
      undefined
    )
    expect(patch.city).toBeUndefined()
    expect(patch.address_1).toBeUndefined()
  })

  it('clears submitted optional address fields when they are empty', () => {
    const patch = billingPatchFromCheckout(
      { ...address, address_2: '', province: '  ', postal_code: '' },
      undefined
    )
    expect(patch.address_2).toBeNull()
    expect(patch.province).toBeNull()
    expect(patch.postal_code).toBeNull()
  })

  it('preserves optional address fields when checkout omits them', () => {
    const patch = billingPatchFromCheckout(
      {
        first_name: address.first_name,
        last_name: address.last_name,
        address_1: address.address_1,
        city: address.city,
        country_code: address.country_code,
      },
      undefined
    )

    expect(patch.address_2).toBeUndefined()
    expect(patch.province).toBeUndefined()
    expect(patch.postal_code).toBeUndefined()
  })
})

describe('billingPatchFromProfileForm', () => {
  it('normalizes the full form submission into an address patch', () => {
    expect(
      billingPatchFromProfileForm({
        countryCode: 'AU',
        addressLine1: '1 Example St',
        addressLine2: null,
        city: 'Perth',
        region: 'WA',
        postalCode: '6000',
        taxNumber: 'abn-1',
      })
    ).toEqual({
      country_code: 'au',
      address_1: '1 Example St',
      address_2: null,
      city: 'Perth',
      province: 'WA',
      postal_code: '6000',
      tax_number: 'abn-1',
    })
  })

  it('maps submitted empty fields to null so the save clears them', () => {
    const patch = billingPatchFromProfileForm({
      countryCode: 'US',
      addressLine1: '  ',
      city: '',
      taxNumber: null,
    })
    expect(patch).toMatchObject({
      address_1: null,
      city: null,
      tax_number: null,
    })
  })

  it('ignores a country outside the billing vocabulary', () => {
    const patch = billingPatchFromProfileForm({
      countryCode: 'XX',
      addressLine1: '1 Example St',
    })
    expect(patch?.country_code).toBeUndefined()
    expect(patch?.address_1).toBe('1 Example St')
  })

  it('returns null for a non-object or empty submission', () => {
    expect(billingPatchFromProfileForm(undefined)).toBeNull()
    expect(billingPatchFromProfileForm('nope')).toBeNull()
    expect(billingPatchFromProfileForm({})).toBeNull()
  })
})
