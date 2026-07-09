import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()
const mockGetAuthToken = vi.fn()
const mockUpsertBillingAddress = vi.fn()
const mockUpdateCustomer = vi.fn()
const mockCreateCart = vi.fn()
const mockGetCart = vi.fn()
const mockUpdateCart = vi.fn()

vi.mock('@/lib/impersonation', () => ({
  assertViewOnly: async () => {},
  ViewOnlyError: class ViewOnlyError extends Error {},
}))

vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
  getAuthToken: (...args: unknown[]) => mockGetAuthToken(...args),
  upsertDefaultBillingAddress: (...args: unknown[]) =>
    mockUpsertBillingAddress(...args),
  updateCustomer: (...args: unknown[]) => mockUpdateCustomer(...args),
}))

vi.mock('@/services/core/external/medusa-client', () => ({
  createCart: (...args: unknown[]) => mockCreateCart(...args),
  getCart: (...args: unknown[]) => mockGetCart(...args),
  updateCart: (...args: unknown[]) => mockUpdateCart(...args),
}))

import { POST, PATCH } from './route'

describe('POST /api/store/cart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthToken.mockResolvedValue('jwt_session')
  })

  it('returns 401 when the customer is not authenticated', async () => {
    mockGetCustomer.mockResolvedValueOnce(null)

    const response = await POST(
      new NextRequest('http://localhost:3000/api/store/cart', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    )

    expect(response.status).toBe(401)
    expect(mockCreateCart).not.toHaveBeenCalled()
  })

  it('creates a cart with the authenticated customer email', async () => {
    mockGetCustomer.mockResolvedValueOnce({
      id: 'cust_1',
      email: 'customer@example.com',
    })
    mockCreateCart.mockResolvedValueOnce({ id: 'cart_1' })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/store/cart', {
        method: 'POST',
        body: JSON.stringify({
          region_id: 'reg_1',
          metadata: { experiment: 'pro_checkout_v1' },
        }),
      })
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(mockCreateCart).toHaveBeenCalledWith(
      {
        region_id: 'reg_1',
        metadata: { experiment: 'pro_checkout_v1' },
        email: 'customer@example.com',
      },
      'jwt_session'
    )
    expect(json.cart.id).toBe('cart_1')
  })

  it('forwards the session token so Medusa links the cart to the customer', async () => {
    mockGetCustomer.mockResolvedValueOnce({
      id: 'cust_1',
      email: 'customer@example.com',
    })
    mockGetAuthToken.mockResolvedValueOnce('jwt_abc')
    mockCreateCart.mockResolvedValueOnce({ id: 'cart_1' })

    await POST(
      new NextRequest('http://localhost:3000/api/store/cart', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    )

    expect(mockCreateCart).toHaveBeenCalledWith(
      { email: 'customer@example.com' },
      'jwt_abc'
    )
  })

  it('does not forward client-supplied line items when creating a cart', async () => {
    mockGetCustomer.mockResolvedValueOnce({
      id: 'cust_1',
      email: 'customer@example.com',
    })
    mockCreateCart.mockResolvedValueOnce({ id: 'cart_1' })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/store/cart', {
        method: 'POST',
        body: JSON.stringify({
          items: [{ variant_id: 'variant_old_or_other', quantity: 99 }],
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(mockCreateCart).toHaveBeenCalledWith(
      {
        email: 'customer@example.com',
      },
      'jwt_session'
    )
  })
})

describe('PATCH /api/store/cart', () => {
  const customer = {
    id: 'cust_1',
    email: 'customer@example.com',
    metadata: {},
  }
  const billingAddress = {
    first_name: 'Ada',
    last_name: 'Lovelace',
    address_1: '42 Wallaby Way',
    address_2: 'Apt 7',
    city: 'Sydney',
    province: 'NSW',
    postal_code: '2000',
    country_code: 'au',
  }

  function patchRequest(body: Record<string, unknown>) {
    return new NextRequest('http://localhost:3000/api/store/cart', {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCustomer.mockResolvedValue(customer)
    mockGetAuthToken.mockResolvedValue('jwt_session')
    mockGetCart.mockResolvedValue({ id: 'cart_1', email: customer.email })
    mockUpdateCart.mockResolvedValue({ id: 'cart_1' })
    mockUpsertBillingAddress.mockResolvedValue(customer)
  })

  it('forwards the tax number as cart metadata', async () => {
    const response = await PATCH(
      patchRequest({
        cartId: 'cart_1',
        billing_address: billingAddress,
        metadata: { taxNumber: ' 51 824 753 556 ' },
      })
    )

    expect(response.status).toBe(200)
    expect(mockUpdateCart).toHaveBeenCalledWith(
      'cart_1',
      {
        billing_address: billingAddress,
        metadata: { taxNumber: '51 824 753 556' },
        email: customer.email,
      },
      'jwt_session'
    )
  })

  it('forwards the session token so Medusa keeps the cart linked to the customer', async () => {
    mockGetAuthToken.mockResolvedValueOnce('jwt_patch')

    await PATCH(
      patchRequest({ cartId: 'cart_1', billing_address: billingAddress })
    )

    expect(mockUpdateCart).toHaveBeenCalledWith(
      'cart_1',
      expect.objectContaining({ email: customer.email }),
      'jwt_patch'
    )
  })

  it('ignores metadata keys other than taxNumber', async () => {
    await PATCH(
      patchRequest({
        cartId: 'cart_1',
        billing_address: billingAddress,
        metadata: { experiment: 'evil-overwrite', taxNumber: 'abn-1' },
      })
    )

    expect(mockUpdateCart).toHaveBeenCalledWith(
      'cart_1',
      {
        billing_address: billingAddress,
        metadata: { taxNumber: 'abn-1' },
        email: customer.email,
      },
      'jwt_session'
    )
  })

  it('clears the cart tax number when the field is submitted empty', async () => {
    await PATCH(
      patchRequest({
        cartId: 'cart_1',
        billing_address: billingAddress,
        metadata: { taxNumber: '' },
      })
    )

    // null deletes the key on Medusa's metadata merge.
    expect(mockUpdateCart).toHaveBeenCalledWith(
      'cart_1',
      {
        billing_address: billingAddress,
        metadata: { taxNumber: null },
        email: customer.email,
      },
      'jwt_session'
    )
  })

  it('clears the saved tax number when the field is submitted empty', async () => {
    await PATCH(
      patchRequest({
        cartId: 'cart_1',
        billing_address: billingAddress,
        metadata: { taxNumber: '' },
      })
    )

    expect(mockUpsertBillingAddress).toHaveBeenCalledWith(
      customer,
      expect.objectContaining({ tax_number: null })
    )
  })

  it('backfills missing customer profile names from the billing address', async () => {
    mockGetCustomer.mockResolvedValueOnce({
      ...customer,
      first_name: '',
      last_name: undefined,
    })

    await PATCH(
      patchRequest({ cartId: 'cart_1', billing_address: billingAddress })
    )

    expect(mockUpdateCustomer).toHaveBeenCalledWith({
      first_name: 'Ada',
      last_name: 'Lovelace',
    })
  })

  it('does not overwrite existing customer profile names from billing', async () => {
    mockGetCustomer.mockResolvedValueOnce({
      ...customer,
      first_name: 'Grace',
      last_name: 'Hopper',
    })

    await PATCH(
      patchRequest({ cartId: 'cart_1', billing_address: billingAddress })
    )

    expect(mockUpdateCustomer).not.toHaveBeenCalled()
  })

  it('waits for the customer profile name backfill before returning success', async () => {
    mockGetCustomer.mockResolvedValueOnce({
      ...customer,
      first_name: '',
      last_name: '',
    })
    let resolveBackfill!: (value: unknown) => void
    mockUpdateCustomer.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveBackfill = resolve
      })
    )

    let settled = false
    const responsePromise = PATCH(
      patchRequest({ cartId: 'cart_1', billing_address: billingAddress })
    ).then((response) => {
      settled = true
      return response
    })

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(settled).toBe(false)

    resolveBackfill(customer)
    const response = await responsePromise

    expect(response.status).toBe(200)
  })

  it('mirrors the billing address and tax number onto the customer address', async () => {
    await PATCH(
      patchRequest({
        cartId: 'cart_1',
        billing_address: billingAddress,
        metadata: { taxNumber: '51 824 753 556' },
      })
    )

    expect(mockUpsertBillingAddress).toHaveBeenCalledWith(customer, {
      first_name: 'Ada',
      last_name: 'Lovelace',
      country_code: 'au',
      address_1: '42 Wallaby Way',
      address_2: 'Apt 7',
      city: 'Sydney',
      province: 'NSW',
      postal_code: '2000',
      tax_number: '51 824 753 556',
    })
  })

  it('preserves the saved tax number when checkout does not submit one', async () => {
    await PATCH(
      patchRequest({ cartId: 'cart_1', billing_address: billingAddress })
    )

    expect(mockUpsertBillingAddress).toHaveBeenCalledWith(
      customer,
      expect.objectContaining({ tax_number: undefined })
    )
  })

  it('still succeeds when the address sync fails', async () => {
    mockUpsertBillingAddress.mockRejectedValueOnce(new Error('medusa down'))

    const response = await PATCH(
      patchRequest({ cartId: 'cart_1', billing_address: billingAddress })
    )

    expect(response.status).toBe(200)
  })

  it('does not touch the customer address when only non-address fields change', async () => {
    await PATCH(patchRequest({ cartId: 'cart_1' }))

    expect(mockUpsertBillingAddress).not.toHaveBeenCalled()
  })
})
