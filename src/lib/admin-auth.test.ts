import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only (this module prevents client-side imports)
vi.mock('server-only', () => ({}))

// Mutable env so each test can control ADMIN_EMAILS
const { mockEnv } = vi.hoisted(() => ({
  mockEnv: { ADMIN_EMAILS: undefined as string | undefined },
}))
vi.mock('@/utils/env', () => ({ env: mockEnv }))

const mockGetCustomer = vi.fn()
vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
}))

const NOT_FOUND_ERROR = new Error('NEXT_NOT_FOUND')
const mockNotFound = vi.fn(() => {
  throw NOT_FOUND_ERROR
})
vi.mock('next/navigation', () => ({
  notFound: () => mockNotFound(),
}))

// Import after mocks are set up
import { isAdmin, requireAdmin } from './admin-auth'

function makeCustomer(email: string) {
  return {
    id: 'cus_123',
    email,
    has_account: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

describe('admin-auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnv.ADMIN_EMAILS = undefined
  })

  describe('isAdmin', () => {
    it('fails closed when ADMIN_EMAILS is unset', async () => {
      mockGetCustomer.mockResolvedValue(makeCustomer('paul@kilbot.com.au'))

      await expect(isAdmin()).resolves.toBe(false)
      // Short-circuits before touching the session at all
      expect(mockGetCustomer).not.toHaveBeenCalled()
    })

    it('fails closed when ADMIN_EMAILS is empty or only separators', async () => {
      mockGetCustomer.mockResolvedValue(makeCustomer('paul@kilbot.com.au'))

      mockEnv.ADMIN_EMAILS = ''
      await expect(isAdmin()).resolves.toBe(false)

      mockEnv.ADMIN_EMAILS = ' , ,'
      await expect(isAdmin()).resolves.toBe(false)
    })

    it('returns false when there is no logged-in customer', async () => {
      mockEnv.ADMIN_EMAILS = 'paul@kilbot.com.au'
      mockGetCustomer.mockResolvedValue(null)

      await expect(isAdmin()).resolves.toBe(false)
    })

    it('matches emails case-insensitively on both sides', async () => {
      mockEnv.ADMIN_EMAILS = ' Paul@Kilbot.com.au , other@example.com'
      mockGetCustomer.mockResolvedValue(makeCustomer('paul@KILBOT.com.au'))

      await expect(isAdmin()).resolves.toBe(true)
    })

    it('returns false for emails not in the allowlist', async () => {
      mockEnv.ADMIN_EMAILS = 'paul@kilbot.com.au'
      mockGetCustomer.mockResolvedValue(makeCustomer('mallory@example.com'))

      await expect(isAdmin()).resolves.toBe(false)
    })
  })

  describe('requireAdmin', () => {
    it('calls notFound when ADMIN_EMAILS is unset', async () => {
      mockGetCustomer.mockResolvedValue(makeCustomer('paul@kilbot.com.au'))

      await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND')
      expect(mockNotFound).toHaveBeenCalled()
    })

    it('calls notFound when there is no logged-in customer', async () => {
      mockEnv.ADMIN_EMAILS = 'paul@kilbot.com.au'
      mockGetCustomer.mockResolvedValue(null)

      await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND')
      expect(mockNotFound).toHaveBeenCalled()
    })

    it('calls notFound for a non-allowlisted customer', async () => {
      mockEnv.ADMIN_EMAILS = 'paul@kilbot.com.au'
      mockGetCustomer.mockResolvedValue(makeCustomer('mallory@example.com'))

      await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND')
    })

    it('returns the customer for an allowlisted admin', async () => {
      mockEnv.ADMIN_EMAILS = 'PAUL@kilbot.com.au'
      const customer = makeCustomer('paul@kilbot.com.au')
      mockGetCustomer.mockResolvedValue(customer)

      await expect(requireAdmin()).resolves.toEqual(customer)
      expect(mockNotFound).not.toHaveBeenCalled()
    })
  })
})
