import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()
const mockAddLineItem = vi.fn()

vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
}))

vi.mock('@/services/core/external/medusa-client', () => ({
  addLineItem: (...args: unknown[]) => mockAddLineItem(...args),
}))

vi.mock('@/lib/logger', () => ({
  storeLogger: {
    error: vi.fn(),
  },
}))

import { POST } from './route'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/store/cart/line-items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/store/cart/line-items', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCustomer.mockResolvedValue({ id: 'cust_1' })
  })

  it('returns 401 when the customer is not authenticated', async () => {
    mockGetCustomer.mockResolvedValueOnce(null)

    const response = await POST(
      makeRequest({ cartId: 'cart_1', variant_id: 'variant_1' })
    )
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.error).toBe('Authentication required')
    expect(mockAddLineItem).not.toHaveBeenCalled()
  })

  it('returns 400 when cartId is missing', async () => {
    const response = await POST(makeRequest({ variant_id: 'variant_1' }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('Cart ID is required')
    expect(mockAddLineItem).not.toHaveBeenCalled()
  })

  it('returns 400 when variant_id is missing', async () => {
    const response = await POST(makeRequest({ cartId: 'cart_1' }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('Variant ID is required')
    expect(mockAddLineItem).not.toHaveBeenCalled()
  })

  it('adds the line item with a default quantity of 1', async () => {
    mockAddLineItem.mockResolvedValueOnce({ id: 'cart_1', items: [] })

    const response = await POST(
      makeRequest({ cartId: 'cart_1', variant_id: 'variant_1' })
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(mockAddLineItem).toHaveBeenCalledWith('cart_1', {
      variant_id: 'variant_1',
      quantity: 1,
    })
    expect(json.cart.id).toBe('cart_1')
  })

  it('adds the line item with the requested quantity', async () => {
    mockAddLineItem.mockResolvedValueOnce({ id: 'cart_1', items: [] })

    const response = await POST(
      makeRequest({ cartId: 'cart_1', variant_id: 'variant_1', quantity: 3 })
    )

    expect(response.status).toBe(200)
    expect(mockAddLineItem).toHaveBeenCalledWith('cart_1', {
      variant_id: 'variant_1',
      quantity: 3,
    })
  })

  it('returns 500 when the medusa client returns no cart', async () => {
    mockAddLineItem.mockResolvedValueOnce(null)

    const response = await POST(
      makeRequest({ cartId: 'cart_1', variant_id: 'variant_1' })
    )
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe('Failed to add item to cart')
  })

  it('returns 500 when the medusa client throws', async () => {
    mockAddLineItem.mockRejectedValueOnce(new Error('network error'))

    const response = await POST(
      makeRequest({ cartId: 'cart_1', variant_id: 'variant_1' })
    )
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe('Internal server error')
  })
})
