import { describe, expect, it, vi, beforeEach } from 'vitest'

const {
  getSessionCustomer,
  findAdminCustomerByEmail,
  startImpersonation,
  redirect,
  consume,
} =
  vi.hoisted(() => ({
    getSessionCustomer: vi.fn(),
    findAdminCustomerByEmail: vi.fn(),
    startImpersonation: vi.fn(),
    redirect: vi.fn(() => {
      throw new Error('REDIRECT')
    }),
    consume: vi.fn(async () => ({ success: true, remaining: 9 })),
  }))

vi.mock('@/lib/medusa-auth', () => ({ getSessionCustomer }))
vi.mock('@/lib/admin', () => ({
  isAdmin: (e?: string | null) => e?.trim().toLowerCase() === 'paul@kilbot.com',
}))
vi.mock('@/lib/discord/medusa-admin', () => ({ findAdminCustomerByEmail }))
vi.mock('@/lib/impersonation', () => ({ startImpersonation }))
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: () => ({ consume }),
  clientIp: () => 'ip',
}))
vi.mock('@/lib/logger', () => ({ authLogger: { info: vi.fn(), warn: vi.fn() } }))
vi.mock('@/i18n/navigation', () => ({ redirect }))
vi.mock('next/headers', () => ({ headers: async () => ({ get: () => 'ip' }) }))

import { startImpersonationAction } from './actions'

beforeEach(() => {
  getSessionCustomer.mockReset()
  findAdminCustomerByEmail.mockReset()
  startImpersonation.mockReset()
  consume.mockReset()
  consume.mockResolvedValue({ success: true, remaining: 9 })
})

describe('startImpersonationAction', () => {
  it('rejects a non-admin session', async () => {
    getSessionCustomer.mockResolvedValue({ email: 'nope@x.com' })
    const result = await startImpersonationAction({ email: 't@x.com', locale: 'en' })
    expect(result).toEqual({ error: 'forbidden' })
    expect(startImpersonation).not.toHaveBeenCalled()
  })

  it('rate limits trusted admin identity before looking up the target', async () => {
    getSessionCustomer.mockResolvedValue({ email: 'Paul@Kilbot.com ' })
    consume.mockResolvedValueOnce({ success: false, remaining: 0 })

    const result = await startImpersonationAction({ email: 't@x.com', locale: 'en' })

    expect(result).toEqual({ error: 'rate_limited' })
    expect(consume).toHaveBeenCalledWith('paul@kilbot.com')
    expect(findAdminCustomerByEmail).not.toHaveBeenCalled()
    expect(startImpersonation).not.toHaveBeenCalled()
  })

  it('reports when the target email is not found', async () => {
    getSessionCustomer.mockResolvedValue({ email: 'paul@kilbot.com' })
    findAdminCustomerByEmail.mockResolvedValue(null)
    const result = await startImpersonationAction({ email: 'ghost@x.com', locale: 'en' })
    expect(result).toEqual({ error: 'not_found' })
    expect(startImpersonation).not.toHaveBeenCalled()
  })

  it('starts impersonation + redirects when admin targets a real customer', async () => {
    getSessionCustomer.mockResolvedValue({ email: 'paul@kilbot.com' })
    findAdminCustomerByEmail.mockResolvedValue({ id: 'cus_t', email: 't@x.com' })
    await expect(
      startImpersonationAction({ email: 't@x.com', locale: 'fr' })
    ).rejects.toThrow('REDIRECT')
    expect(startImpersonation).toHaveBeenCalledWith('cus_t')
    expect(redirect).toHaveBeenCalledWith({ href: '/account', locale: 'fr' })
  })
})
