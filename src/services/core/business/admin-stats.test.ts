import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only (this module prevents client-side imports)
vi.mock('server-only', () => ({}))

const mockListLicenses = vi.fn()
const mockListMachines = vi.fn()
vi.mock('@/services/core/external/license-client', () => ({
  licenseClient: {
    listLicenses: (...args: unknown[]) => mockListLicenses(...args),
    listMachines: (...args: unknown[]) => mockListMachines(...args),
  },
}))

// Import after mocks are set up
import { getLicenseStats } from './admin-stats'

function makeLicense(id: string, status: string, expiry: string | null) {
  return {
    id,
    key: `KEY-${id}`,
    status,
    expiry,
    maxMachines: 2,
    metadata: {},
    policyId: 'policy-yearly',
    createdAt: '2026-01-01T00:00:00Z',
  }
}

const NOW = new Date('2026-06-10T00:00:00Z')

describe('getLicenseStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('aggregates status counts with display rules and machine totals', async () => {
    mockListLicenses.mockResolvedValueOnce({
      items: [
        makeLicense('a', 'ACTIVE', '2027-01-01T00:00:00Z'),
        // Keygen still says ACTIVE but expiry has passed — counted as expired
        makeLicense('b', 'ACTIVE', '2025-01-01T00:00:00Z'),
        makeLicense('c', 'EXPIRED', '2024-01-01T00:00:00Z'),
        makeLicense('d', 'SUSPENDED', null),
      ],
      page: 1,
      pageSize: 100,
      hasNextPage: false,
    })
    mockListMachines.mockResolvedValueOnce({
      items: [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }],
      page: 1,
      pageSize: 100,
      hasNextPage: false,
    })

    const stats = await getLicenseStats(NOW)

    expect(stats.totalLicenses).toBe(4)
    expect(stats.byStatus).toEqual({ active: 1, expired: 2, suspended: 1 })
    expect(stats.totalMachines).toBe(3)
    expect(stats.truncated).toBe(false)
    // Recent licenses come from page 1, capped at 5
    expect(stats.recentLicenses.map((license) => license.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ])
    // Display status applies the active-past-expiry rule
    expect(
      stats.recentLicenses.map((license) => license.displayStatus)
    ).toEqual(['active', 'expired', 'expired', 'suspended'])
  })

  it('pages through results until hasNextPage is false', async () => {
    mockListLicenses
      .mockResolvedValueOnce({
        items: Array.from({ length: 100 }, (_, i) =>
          makeLicense(`p1-${i}`, 'ACTIVE', '2027-01-01T00:00:00Z')
        ),
        page: 1,
        pageSize: 100,
        hasNextPage: true,
      })
      .mockResolvedValueOnce({
        items: [makeLicense('p2-0', 'EXPIRED', null)],
        page: 2,
        pageSize: 100,
        hasNextPage: false,
      })
    mockListMachines.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 100,
      hasNextPage: false,
    })

    const stats = await getLicenseStats(NOW)

    expect(mockListLicenses).toHaveBeenCalledTimes(2)
    expect(stats.totalLicenses).toBe(101)
    expect(stats.byStatus).toEqual({ active: 100, expired: 1 })
    expect(stats.recentLicenses).toHaveLength(5)
    expect(stats.truncated).toBe(false)
  })

  it('marks results truncated when the page cap is hit', async () => {
    mockListLicenses.mockResolvedValue({
      items: [makeLicense('x', 'ACTIVE', '2027-01-01T00:00:00Z')],
      page: 1,
      pageSize: 100,
      hasNextPage: true, // never ends
    })
    mockListMachines.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 100,
      hasNextPage: false,
    })

    const stats = await getLicenseStats(NOW)

    expect(mockListLicenses).toHaveBeenCalledTimes(10)
    expect(stats.truncated).toBe(true)
  })

  it('propagates license server failures to the caller', async () => {
    mockListLicenses.mockRejectedValue(new Error('Keygen listLicenses failed (403)'))
    mockListMachines.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 100,
      hasNextPage: false,
    })

    await expect(getLicenseStats(NOW)).rejects.toThrow(
      'Keygen listLicenses failed (403)'
    )
  })
})
