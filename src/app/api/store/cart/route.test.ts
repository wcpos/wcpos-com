import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()
const mockCreateCart = vi.fn()

vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
}))

vi.mock('@/services/core/external/medusa-client', () => ({
  createCart: (...args: unknown[]) => mockCreateCart(...args),
  getCart: vi.fn(),
  updateCart: vi.fn(),
}))

import { POST } from './route'

describe('POST /api/store/cart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
        body: JSON.stringify({ region_id: 'reg_1' }),
      })
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(mockCreateCart).toHaveBeenCalledWith({
      region_id: 'reg_1',
      email: 'customer@example.com',
    })
    expect(json.cart.id).toBe('cart_1')
  })
})
