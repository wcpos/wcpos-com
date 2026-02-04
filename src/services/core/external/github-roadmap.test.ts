import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/utils/env', () => ({
  env: {
    GITHUB_PROJECT_NUMBER: 1,
  },
}))

// Mock the shared Octokit factory
const { mockGraphql } = vi.hoisted(() => ({ mockGraphql: vi.fn() }))
vi.mock('./github-auth', () => ({
  getOctokit: vi.fn(() => ({ graphql: mockGraphql })),
}))

import { fetchRoadmapData, transformProjectItems } from './github-roadmap'

// Sample GraphQL response matching GitHub Projects V2 shape
const mockProjectItems = {
  organization: {
    projectV2: {
      items: {
        pageInfo: { hasNextPage: false, endCursor: null },
        nodes: [
          {
            fieldValueByName: { name: 'In Progress' },
            content: {
              __typename: 'Issue',
              id: 'I_kwDOA1',
              title: 'Add offline sync',
              bodyText: 'Implement offline data synchronization for the POS app so it works without internet.',
              state: 'OPEN',
              number: 42,
              url: 'https://github.com/wcpos/monorepo/issues/42',
              labels: { nodes: [{ name: 'enhancement' }] },
              milestone: {
                title: 'v1.9.0',
                description: 'Offline support & sync improvements',
                dueOn: '2026-04-01T00:00:00Z',
                state: 'OPEN',
              },
              repository: { name: 'monorepo' },
            },
          },
          {
            fieldValueByName: { name: 'Up Next' },
            content: {
              __typename: 'Issue',
              id: 'I_kwDOA2',
              title: 'Fix barcode scanner crash',
              bodyText: 'Scanner crashes when scanning certain QR codes with special characters.',
              state: 'OPEN',
              number: 43,
              url: 'https://github.com/wcpos/monorepo/issues/43',
              labels: { nodes: [{ name: 'bug' }] },
              milestone: {
                title: 'v1.9.0',
                description: 'Offline support & sync improvements',
                dueOn: '2026-04-01T00:00:00Z',
                state: 'OPEN',
              },
              repository: { name: 'monorepo' },
            },
          },
          {
            fieldValueByName: { name: 'Done' },
            content: {
              __typename: 'Issue',
              id: 'I_kwDOB1',
              title: 'Multi-currency support',
              bodyText: 'Allow switching between currencies at the register.',
              state: 'CLOSED',
              number: 30,
              url: 'https://github.com/wcpos/woocommerce-pos/issues/30',
              labels: { nodes: [{ name: 'enhancement' }] },
              milestone: {
                title: 'v1.8.8',
                description: null,
                dueOn: null,
                state: 'CLOSED',
              },
              repository: { name: 'woocommerce-pos' },
            },
          },
          {
            fieldValueByName: { name: 'Done' },
            content: {
              __typename: 'Issue',
              id: 'I_kwDOB2',
              title: 'Fix receipt printing alignment',
              bodyText: 'Receipt text was misaligned on certain thermal printers.',
              state: 'CLOSED',
              number: 31,
              url: 'https://github.com/wcpos/woocommerce-pos/issues/31',
              labels: { nodes: [{ name: 'bug' }] },
              milestone: {
                title: 'v1.8.8',
                description: null,
                dueOn: null,
                state: 'CLOSED',
              },
              repository: { name: 'woocommerce-pos' },
            },
          },
          // Item from wrong repo — should be filtered out
          {
            fieldValueByName: { name: 'Up Next' },
            content: {
              __typename: 'Issue',
              id: 'I_kwDOC1',
              title: 'Update Medusa plugins',
              bodyText: 'Upgrade to latest Medusa v2.',
              state: 'OPEN',
              number: 10,
              url: 'https://github.com/wcpos/wcpos-medusa/issues/10',
              labels: { nodes: [{ name: 'enhancement' }] },
              milestone: null,
              repository: { name: 'wcpos-medusa' },
            },
          },
          // Item with non-public label — should be filtered out
          {
            fieldValueByName: { name: 'Up Next' },
            content: {
              __typename: 'Issue',
              id: 'I_kwDOA3',
              title: 'Update dependencies',
              bodyText: 'Bump all deps.',
              state: 'OPEN',
              number: 50,
              url: 'https://github.com/wcpos/monorepo/issues/50',
              labels: { nodes: [{ name: 'dependencies' }] },
              milestone: {
                title: 'v1.9.0',
                description: 'Offline support & sync improvements',
                dueOn: '2026-04-01T00:00:00Z',
                state: 'OPEN',
              },
              repository: { name: 'monorepo' },
            },
          },
          // Item in Backlog status — should be filtered out
          {
            fieldValueByName: { name: 'Backlog' },
            content: {
              __typename: 'Issue',
              id: 'I_kwDOA4',
              title: 'Voice commands',
              bodyText: 'Add voice command support.',
              state: 'OPEN',
              number: 99,
              url: 'https://github.com/wcpos/monorepo/issues/99',
              labels: { nodes: [{ name: 'enhancement' }] },
              milestone: null,
              repository: { name: 'monorepo' },
            },
          },
          // Item without milestone — should be filtered out
          {
            fieldValueByName: { name: 'In Progress' },
            content: {
              __typename: 'Issue',
              id: 'I_kwDOA5',
              title: 'Random fix',
              bodyText: 'Some quick fix.',
              state: 'OPEN',
              number: 55,
              url: 'https://github.com/wcpos/monorepo/issues/55',
              labels: { nodes: [{ name: 'bug' }] },
              milestone: null,
              repository: { name: 'monorepo' },
            },
          },
          // DraftIssue — should be filtered out
          {
            fieldValueByName: { name: 'Up Next' },
            content: {
              __typename: 'DraftIssue',
              title: 'Some draft idea',
              body: 'Not a real issue yet.',
            },
          },
        ],
      },
    },
  },
}

describe('github-roadmap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('transformProjectItems', () => {
    it('groups items by milestone into active, upcoming, and shipped', () => {
      const result = transformProjectItems(mockProjectItems)

      // v1.9.0 has an "In Progress" item → active
      expect(result.active).toHaveLength(1)
      expect(result.active[0].title).toBe('v1.9.0')

      // No milestones that are only "Up Next" without "In Progress" → empty
      expect(result.upcoming).toHaveLength(0)

      // v1.8.8 is closed → shipped
      expect(result.shipped).toHaveLength(1)
      expect(result.shipped[0].title).toBe('v1.8.8')
    })

    it('separates features and bugs within milestones', () => {
      const result = transformProjectItems(mockProjectItems)

      const active = result.active[0]
      expect(active.features).toHaveLength(1)
      expect(active.features[0].title).toBe('Add offline sync')
      expect(active.bugs).toHaveLength(1)
      expect(active.bugs[0].title).toBe('Fix barcode scanner crash')
    })

    it('calculates progress correctly', () => {
      const result = transformProjectItems(mockProjectItems)

      // v1.9.0: 0 done out of 2
      expect(result.active[0].progress).toEqual({ total: 2, completed: 0 })

      // v1.8.8: 2 done out of 2
      expect(result.shipped[0].progress).toEqual({ total: 2, completed: 2 })
    })

    it('filters out items from non-app repos', () => {
      const result = transformProjectItems(mockProjectItems)
      const allItems = [
        ...result.active.flatMap(m => [...m.features, ...m.bugs]),
        ...result.shipped.flatMap(m => [...m.features, ...m.bugs]),
      ]

      expect(allItems.find(i => i.title === 'Update Medusa plugins')).toBeUndefined()
    })

    it('filters out items with non-public labels', () => {
      const result = transformProjectItems(mockProjectItems)
      const allItems = [
        ...result.active.flatMap(m => [...m.features, ...m.bugs]),
        ...result.shipped.flatMap(m => [...m.features, ...m.bugs]),
      ]

      expect(allItems.find(i => i.title === 'Update dependencies')).toBeUndefined()
    })

    it('filters out items in Backlog/Triage status', () => {
      const result = transformProjectItems(mockProjectItems)
      const allItems = [
        ...result.active.flatMap(m => [...m.features, ...m.bugs]),
        ...result.upcoming.flatMap(m => [...m.features, ...m.bugs]),
        ...result.shipped.flatMap(m => [...m.features, ...m.bugs]),
      ]

      expect(allItems.find(i => i.title === 'Voice commands')).toBeUndefined()
    })

    it('filters out items without a milestone', () => {
      const result = transformProjectItems(mockProjectItems)
      const allItems = [
        ...result.active.flatMap(m => [...m.features, ...m.bugs]),
        ...result.shipped.flatMap(m => [...m.features, ...m.bugs]),
      ]

      expect(allItems.find(i => i.title === 'Random fix')).toBeUndefined()
    })

    it('filters out DraftIssues', () => {
      const result = transformProjectItems(mockProjectItems)
      const allItems = [
        ...result.active.flatMap(m => [...m.features, ...m.bugs]),
        ...result.shipped.flatMap(m => [...m.features, ...m.bugs]),
      ]

      expect(allItems.find(i => i.title === 'Some draft idea')).toBeUndefined()
    })

    it('truncates descriptions to 150 characters', () => {
      const longItem = {
        organization: {
          projectV2: {
            items: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [{
                fieldValueByName: { name: 'Up Next' },
                content: {
                  __typename: 'Issue',
                  id: 'I_kwDOD1',
                  title: 'Long description feature',
                  bodyText: 'A'.repeat(300),
                  state: 'OPEN',
                  number: 100,
                  url: 'https://github.com/wcpos/monorepo/issues/100',
                  labels: { nodes: [{ name: 'enhancement' }] },
                  milestone: { title: 'v2.0.0', description: null, dueOn: null, state: 'OPEN' },
                  repository: { name: 'monorepo' },
                },
              }],
            },
          },
        },
      }

      const result = transformProjectItems(longItem)
      const feature = result.upcoming[0]?.features[0]
      expect(feature?.description.length).toBeLessThanOrEqual(153) // 150 + '...'
    })

    it('returns empty data when no items match', () => {
      const empty = {
        organization: {
          projectV2: {
            items: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [],
            },
          },
        },
      }

      const result = transformProjectItems(empty)
      expect(result.active).toHaveLength(0)
      expect(result.upcoming).toHaveLength(0)
      expect(result.shipped).toHaveLength(0)
    })

    it('limits shipped milestones to the 2 most recent', () => {
      const manyShipped = {
        organization: {
          projectV2: {
            items: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: ['v1.8.5', 'v1.8.6', 'v1.8.7', 'v1.8.8'].map((version, i) => ({
                fieldValueByName: { name: 'Done' },
                content: {
                  __typename: 'Issue',
                  id: `I_kwDOE${i}`,
                  title: `Feature for ${version}`,
                  bodyText: 'Done feature.',
                  state: 'CLOSED',
                  number: 200 + i,
                  url: `https://github.com/wcpos/monorepo/issues/${200 + i}`,
                  labels: { nodes: [{ name: 'enhancement' }] },
                  milestone: { title: version, description: null, dueOn: null, state: 'CLOSED' },
                  repository: { name: 'monorepo' },
                },
              })),
            },
          },
        },
      }

      const result = transformProjectItems(manyShipped)
      expect(result.shipped).toHaveLength(2)
      expect(result.shipped[0].title).toBe('v1.8.8')
      expect(result.shipped[1].title).toBe('v1.8.7')
    })
  })

  describe('fetchRoadmapData', () => {
    it('calls GitHub GraphQL API and returns transformed data', async () => {
      mockGraphql.mockResolvedValueOnce(mockProjectItems)

      const result = await fetchRoadmapData()

      expect(mockGraphql).toHaveBeenCalledTimes(1)
      expect(result.active).toHaveLength(1)
      expect(result.shipped).toHaveLength(1)
    })

    it('paginates through multiple pages', async () => {
      const page1 = {
        organization: {
          projectV2: {
            items: {
              pageInfo: { hasNextPage: true, endCursor: 'cursor1' },
              nodes: [mockProjectItems.organization.projectV2.items.nodes[0]],
            },
          },
        },
      }
      const page2 = {
        organization: {
          projectV2: {
            items: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [mockProjectItems.organization.projectV2.items.nodes[1]],
            },
          },
        },
      }

      mockGraphql.mockResolvedValueOnce(page1).mockResolvedValueOnce(page2)

      const result = await fetchRoadmapData()

      expect(mockGraphql).toHaveBeenCalledTimes(2)
      expect(mockGraphql).toHaveBeenNthCalledWith(1, expect.any(String), expect.objectContaining({ cursor: null }))
      expect(mockGraphql).toHaveBeenNthCalledWith(2, expect.any(String), expect.objectContaining({ cursor: 'cursor1' }))
      // Both items are in v1.9.0 active milestone
      expect(result.active).toHaveLength(1)
      expect(result.active[0].features).toHaveLength(1)
      expect(result.active[0].bugs).toHaveLength(1)
    })

    it('returns empty data on API error', async () => {
      mockGraphql.mockRejectedValueOnce(new Error('GraphQL error'))

      const result = await fetchRoadmapData()

      expect(result.active).toHaveLength(0)
      expect(result.upcoming).toHaveLength(0)
      expect(result.shipped).toHaveLength(0)
    })
  })
})
