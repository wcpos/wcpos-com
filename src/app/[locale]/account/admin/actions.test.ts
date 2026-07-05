import { describe, expect, it, vi, beforeEach } from 'vitest'

const { getSessionCustomer, findAdminCustomerByEmail, startImpersonation, redirect } =
  vi.hoisted(() => ({
    getSessionCustomer: vi.fn(),
    findAdminCustomerByEmail: vi.fn(),
    startImpersonation: vi.fn(),
    redirect: vi.fn(() => {
      throw new Error('REDIRECT')
    }),
  }))

vi.mock('@/lib/medusa-auth', () => ({ getSessionCustomer }))
vi.mock('@/lib/admin', () => ({
  isAdmin: (e?: string | null) => e === 'paul@kilbot.com',
}))
vi.mock('@/lib/discord/medusa-admin', () => ({ findAdminCustomerByEmail }))
vi.mock('@/lib/impersonation', () => ({ startImpersonation }))
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: () => ({ consume: async () => ({ success: true, remaining: 9 }) }),
  clientIp: () => 'ip',
}))
vi.mock('@/lib/logger', () => ({ authLogger: { info: vi.fn(), warn: vi.fn() } }))
vi.mock('next/navigation', () => ({ redirect }))
vi.mock('next/headers', () => ({ headers: async () => ({ get: () => 'ip' }) }))

import { startImpersonationAction } from './actions'

beforeEach(() => {
  getSessionCustomer.mockReset()
  findAdminCustomerByEmail.mockReset()
  startImpersonation.mockReset()
})

describe('startImpersonationAction', () => {
  it('rejects a non-admin session', async () => {
    getSessionCustomer.mockResolvedValue({ email: 'nope@x.com' })
    const result = await startImpersonationAction({ email: 't@x.com' })
    expect(result).toEqual({ error: 'forbidden' })
    expect(startImpersonation).not.toHaveBeenCalled()
  })

  it('reports when the target email is not found', async () => {
    getSessionCustomer.mockResolvedValue({ email: 'paul@kilbot.com' })
    findAdminCustomerByEmail.mockResolvedValue(null)
    const result = await startImpersonationAction({ email: 'ghost@x.com' })
    expect(result).toEqual({ error: 'not_found' })
    expect(startImpersonation).not.toHaveBeenCalled()
  })

  it('starts impersonation + redirects when admin targets a real customer', async () => {
    getSessionCustomer.mockResolvedValue({ email: 'paul@kilbot.com' })
    findAdminCustomerByEmail.mockResolvedValue({ id: 'cus_t', email: 't@x.com' })
    await expect(startImpersonationAction({ email: 't@x.com' })).rejects.toThrow('REDIRECT')
    expect(startImpersonation).toHaveBeenCalledWith('cus_t')
  })
})
