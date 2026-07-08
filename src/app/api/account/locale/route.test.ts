import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()
const mockUpdateCustomer = vi.fn()
const { assertViewOnly } = vi.hoisted(() => ({
  assertViewOnly: vi.fn(),
}))

vi.mock('@/lib/impersonation', () => ({
  assertViewOnly,
  ViewOnlyError: class ViewOnlyError extends Error {},
}))
vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
  updateCustomer: (...args: unknown[]) => mockUpdateCustomer(...args),
}))
vi.mock('@/lib/logger', () => ({
  apiLogger: { error: vi.fn() },
}))

import { PATCH } from './route'

function localeRequest(locale: string) {
  return new NextRequest('http://localhost:3000/api/account/locale', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locale }),
  })
}

describe('PATCH /api/account/locale', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('merges the selected locale into customer metadata for localized emails', async () => {
    mockGetCustomer.mockResolvedValueOnce({
      id: 'cust_1',
      metadata: {
        marketing_opt_in: true,
        account_profile: { countryCode: 'FR' },
      },
    })
    mockUpdateCustomer.mockResolvedValueOnce({ id: 'cust_1' })

    const response = await PATCH(localeRequest('fr'))

    expect(response.status).toBe(200)
    expect(mockUpdateCustomer).toHaveBeenCalledWith({
      metadata: {
        marketing_opt_in: true,
        account_profile: { countryCode: 'FR' },
        locale: 'fr',
      },
    })
    await expect(response.json()).resolves.toEqual({ locale: 'fr' })
  })

  it('normalizes regional and weighted locale preferences before saving', async () => {
    mockGetCustomer.mockResolvedValueOnce({
      id: 'cust_1',
      metadata: {
        marketing_opt_in: true,
      },
    })
    mockUpdateCustomer.mockResolvedValueOnce({ id: 'cust_1' })

    const response = await PATCH(localeRequest('pl-PL;q=1.0, fr-FR;q=0.9'))

    expect(response.status).toBe(200)
    expect(mockUpdateCustomer).toHaveBeenCalledWith({
      metadata: {
        marketing_opt_in: true,
        locale: 'fr',
      },
    })
    await expect(response.json()).resolves.toEqual({ locale: 'fr' })
  })

  it('rejects unsupported locales before updating the customer', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1', metadata: {} })

    const response = await PATCH(localeRequest('pl-PL, xx-INVALID'))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ errorCode: 'invalid_locale' })
    expect(mockUpdateCustomer).not.toHaveBeenCalled()
  })
})
