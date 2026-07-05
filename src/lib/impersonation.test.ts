import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

const { cookieStore, headerStore, getSessionCustomer } = vi.hoisted(() => {
  const cookieStore = {
    value: undefined as string | undefined,
    get: (name: string) =>
      name === 'wcpos-impersonate' && cookieStore.value
        ? { value: cookieStore.value }
        : undefined,
    set: vi.fn((_n: string, v: string) => {
      cookieStore.value = v
    }),
    delete: vi.fn(() => {
      cookieStore.value = undefined
    }),
  }
  const headerStore = { value: undefined as string | undefined }
  const getSessionCustomer = vi.fn()
  return { cookieStore, headerStore, getSessionCustomer }
})

vi.mock('next/headers', () => ({
  cookies: async () => cookieStore,
  headers: async () => ({
    get: (n: string) =>
      n === 'x-wcpos-account-request' ? headerStore.value ?? null : null,
  }),
}))

vi.mock('@/lib/medusa-auth', () => ({ getSessionCustomer }))
vi.mock('@/lib/admin', () => ({
  isAdmin: (email?: string | null) => email === 'paul@kilbot.com',
}))

import { getImpersonation, assertViewOnly, ViewOnlyError } from './impersonation'

beforeEach(() => {
  cookieStore.value = undefined
  headerStore.value = undefined
  getSessionCustomer.mockReset()
  cookieStore.set.mockClear()
  cookieStore.delete.mockClear()
})

describe('getImpersonation', () => {
  it('returns the target when admin session + cookie + account header all present', async () => {
    cookieStore.value = 'cus_target'
    headerStore.value = '1'
    getSessionCustomer.mockResolvedValue({ email: 'paul@kilbot.com' })
    expect(await getImpersonation()).toEqual({
      adminEmail: 'paul@kilbot.com',
      targetId: 'cus_target',
    })
  })

  it('returns null outside the account area (no header)', async () => {
    cookieStore.value = 'cus_target'
    headerStore.value = undefined
    getSessionCustomer.mockResolvedValue({ email: 'paul@kilbot.com' })
    expect(await getImpersonation()).toBeNull()
  })

  it('returns null and clears the cookie when the real session is NOT admin', async () => {
    cookieStore.value = 'cus_target'
    headerStore.value = '1'
    getSessionCustomer.mockResolvedValue({ email: 'attacker@evil.com' })
    expect(await getImpersonation()).toBeNull()
    expect(cookieStore.delete).toHaveBeenCalledWith('wcpos-impersonate')
  })

  it('returns null when there is no cookie', async () => {
    headerStore.value = '1'
    getSessionCustomer.mockResolvedValue({ email: 'paul@kilbot.com' })
    expect(await getImpersonation()).toBeNull()
  })
})

describe('assertViewOnly', () => {
  it('throws ViewOnlyError while impersonating', async () => {
    cookieStore.value = 'cus_target'
    headerStore.value = '1'
    getSessionCustomer.mockResolvedValue({ email: 'paul@kilbot.com' })
    await expect(assertViewOnly()).rejects.toBeInstanceOf(ViewOnlyError)
  })

  it('is a no-op when not impersonating', async () => {
    getSessionCustomer.mockResolvedValue({ email: 'paul@kilbot.com' })
    await expect(assertViewOnly()).resolves.toBeUndefined()
  })
})
