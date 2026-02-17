import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()
const mockUpdateCustomer = vi.fn()

vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
  updateCustomer: (...args: unknown[]) => mockUpdateCustomer(...args),
}))

import { PATCH } from './route'

describe('PATCH /api/account/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCustomer.mockResolvedValueOnce(null)

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: 'Test' }),
      })
    )

    expect(response.status).toBe(401)
  })

  it('updates profile and returns customer', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockUpdateCustomer.mockResolvedValueOnce({
      id: 'cust_1',
      email: 'updated@example.com',
      first_name: 'Updated',
      last_name: 'Name',
      phone: '+15551234567',
    })

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'updated@example.com',
          first_name: 'Updated',
          last_name: 'Name',
          phone: '+15551234567',
        }),
      })
    )

    const json = await response.json()

    expect(response.status).toBe(200)
    expect(mockUpdateCustomer).toHaveBeenCalledWith({
      email: 'updated@example.com',
      first_name: 'Updated',
      last_name: 'Name',
      phone: '+15551234567',
    })
    expect(json.customer.email).toBe('updated@example.com')
  })

  it('returns 400 when email is empty', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: '   ',
          first_name: 'Updated',
        }),
      })
    )

    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('Email is required')
    expect(mockUpdateCustomer).not.toHaveBeenCalled()
  })
})
