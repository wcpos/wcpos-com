# Roadmap Page Implementation Plan

> **For Claude:** REQUIRED: Use /execute-plan to implement this plan task-by-task.

**Goal:** Build a public roadmap page at `/roadmap` that pulls from GitHub Projects V2 and displays upcoming features organized by milestone.

**Architecture:** A Next.js page using PPR — static shell prerendered, dynamic milestone data streamed via Suspense. GitHub GraphQL API fetches project items, cached with `use cache` + `cacheTag`. A webhook endpoint enables on-demand cache invalidation when project items change.

**Tech Stack:** Next.js 16 (PPR/cacheComponents), `@octokit/rest` (existing, includes GraphQL), Tailwind CSS, shadcn/ui components (Card, Badge), Vitest for unit tests.

**Worktree:** `/Users/kilbot/Projects/wcpos-com/.worktrees/roadmap-page`

**Design doc:** `/Users/kilbot/Projects/wcpos-infra/docs/plans/2026-02-04-roadmap-page-design.md`

---

### Task 1: Add Roadmap Types

**Files:**
- Create: `src/types/roadmap.ts`

**Step 1: Create the types file**

```typescript
// src/types/roadmap.ts

export type RoadmapStatus = 'planned' | 'in_progress' | 'done'

export type RoadmapItemType = 'feature' | 'bug'

export interface RoadmapItem {
  id: number
  title: string
  description: string
  status: RoadmapStatus
  type: RoadmapItemType
  url: string
}

export interface RoadmapMilestone {
  title: string
  description: string | null
  dueOn: string | null
  state: 'open' | 'closed'
  features: RoadmapItem[]
  bugs: RoadmapItem[]
  progress: {
    total: number
    completed: number
  }
}

export interface RoadmapData {
  active: RoadmapMilestone[]
  upcoming: RoadmapMilestone[]
  shipped: RoadmapMilestone[]
}
```

**Step 2: Verify types compile**

Run: `cd /Users/kilbot/Projects/wcpos-com/.worktrees/roadmap-page && pnpm type-check`
Expected: PASS (no type errors)

**Step 3: Commit**

```bash
git add src/types/roadmap.ts
git commit -m "feat(roadmap): add roadmap types"
```

---

### Task 2: Add Environment Variables and Cache Profile

**Files:**
- Modify: `src/utils/env.ts`
- Modify: `next.config.ts`

**Step 1: Add env vars to schema**

In `src/utils/env.ts`, add these fields to the `envSchema` object (after the `GITHUB_PAT` line):

```typescript
  // GitHub Project (for roadmap page)
  GITHUB_PROJECT_NUMBER: z.coerce.number().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
```

Note: `z.coerce.number()` converts the string env var to a number automatically.

**Step 2: Add roadmap cache profile to next.config.ts**

In `next.config.ts`, add a new cache profile inside the `cacheLife` object:

```typescript
    // 30 minute cache for roadmap data (revalidated on-demand via webhook)
    'roadmap': {
      stale: 1800,     // Serve stale for 30 min
      revalidate: 300,  // Start revalidating after 5 min
      expire: 7200,    // Expire after 2 hours
    },
```

**Step 3: Verify types compile**

Run: `cd /Users/kilbot/Projects/wcpos-com/.worktrees/roadmap-page && pnpm type-check`
Expected: PASS

**Step 4: Commit**

```bash
git add src/utils/env.ts next.config.ts
git commit -m "feat(roadmap): add env vars and cache profile for roadmap"
```

---

### Task 3: GitHub Roadmap Data Layer — Tests First

**Files:**
- Create: `src/services/core/external/github-roadmap.test.ts`
- Create: `src/services/core/external/github-roadmap.ts`

**Step 1: Write the test file**

Create `src/services/core/external/github-roadmap.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/utils/env', () => ({
  env: {
    GITHUB_PAT: 'ghp_test_token',
    GITHUB_PROJECT_NUMBER: 1,
  },
}))

// Mock the Octokit instance
const mockGraphql = vi.fn()
vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn(() => ({ graphql: mockGraphql })),
}))

import { fetchRoadmapData, transformProjectItems } from './github-roadmap'
import type { RoadmapData } from '@/types/roadmap'

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

      // "Update Medusa plugins" from wcpos-medusa should not appear
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
      // Most recent versions should be kept (v1.8.8 and v1.8.7)
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

    it('returns empty data on API error', async () => {
      mockGraphql.mockRejectedValueOnce(new Error('GraphQL error'))

      const result = await fetchRoadmapData()

      expect(result.active).toHaveLength(0)
      expect(result.upcoming).toHaveLength(0)
      expect(result.shipped).toHaveLength(0)
    })
  })
})
```

**Step 2: Run the tests to verify they fail**

Run: `cd /Users/kilbot/Projects/wcpos-com/.worktrees/roadmap-page && pnpm test:unit -- src/services/core/external/github-roadmap.test.ts`
Expected: FAIL — module `./github-roadmap` not found

**Step 3: Implement the data layer**

Create `src/services/core/external/github-roadmap.ts`:

```typescript
import 'server-only'

import { Octokit } from '@octokit/rest'
import { env } from '@/utils/env'
import { infraLogger } from '@/lib/logger'
import type { RoadmapData, RoadmapItem, RoadmapMilestone, RoadmapStatus, RoadmapItemType } from '@/types/roadmap'

const octokit = new Octokit({ auth: env.GITHUB_PAT })

const GITHUB_ORG = 'wcpos'
const ALLOWED_REPOS = ['woocommerce-pos', 'woocommerce-pos-pro', 'monorepo', 'electron']
const FEATURE_LABELS = ['enhancement', 'ui']
const BUG_LABELS = ['bug']
const PUBLIC_LABELS = [...FEATURE_LABELS, ...BUG_LABELS]

const STATUS_MAP: Record<string, RoadmapStatus | null> = {
  'Triage': null,     // hidden
  'Backlog': null,    // hidden
  'Up Next': 'planned',
  'In Progress': 'in_progress',
  'Done': 'done',
}

const MAX_SHIPPED_MILESTONES = 2
const DESCRIPTION_MAX_LENGTH = 150

const PROJECT_ITEMS_QUERY = `
  query($org: String!, $number: Int!, $cursor: String) {
    organization(login: $org) {
      projectV2(number: $number) {
        items(first: 100, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            fieldValueByName(name: "Status") {
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
              }
            }
            content {
              __typename
              ... on Issue {
                title
                bodyText
                state
                number
                url
                labels(first: 10) {
                  nodes {
                    name
                  }
                }
                milestone {
                  title
                  description
                  dueOn
                  state
                }
                repository {
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformProjectItems(data: any): RoadmapData {
  const items = data?.organization?.projectV2?.items?.nodes ?? []
  const milestoneMap = new Map<string, {
    title: string
    description: string | null
    dueOn: string | null
    state: 'open' | 'closed'
    features: RoadmapItem[]
    bugs: RoadmapItem[]
    hasInProgress: boolean
  }>()

  for (const item of items) {
    const content = item?.content
    if (!content || content.__typename !== 'Issue') continue

    // Filter: must have a milestone
    if (!content.milestone) continue

    // Filter: must be from an allowed repo
    const repoName = content.repository?.name
    if (!repoName || !ALLOWED_REPOS.includes(repoName)) continue

    // Filter: must have a public label
    const labels: string[] = (content.labels?.nodes ?? []).map((l: { name: string }) => l.name)
    const hasPublicLabel = labels.some(l => PUBLIC_LABELS.includes(l))
    if (!hasPublicLabel) continue

    // Filter: must have a visible status
    const statusName = item.fieldValueByName?.name ?? ''
    const mappedStatus = STATUS_MAP[statusName]
    if (!mappedStatus) continue

    // Determine item type
    const isFeature = labels.some(l => FEATURE_LABELS.includes(l))
    const type: RoadmapItemType = isFeature ? 'feature' : 'bug'

    // Truncate description
    const bodyText = content.bodyText ?? ''
    const description = bodyText.length > DESCRIPTION_MAX_LENGTH
      ? bodyText.slice(0, DESCRIPTION_MAX_LENGTH) + '...'
      : bodyText

    const roadmapItem: RoadmapItem = {
      id: content.number,
      title: content.title,
      description,
      status: mappedStatus,
      type,
      url: content.url,
    }

    // Group by milestone
    const milestoneTitle = content.milestone.title
    if (!milestoneMap.has(milestoneTitle)) {
      milestoneMap.set(milestoneTitle, {
        title: milestoneTitle,
        description: content.milestone.description || null,
        dueOn: content.milestone.dueOn || null,
        state: content.milestone.state === 'CLOSED' ? 'closed' : 'open',
        features: [],
        bugs: [],
        hasInProgress: false,
      })
    }

    const milestone = milestoneMap.get(milestoneTitle)!
    if (type === 'feature') {
      milestone.features.push(roadmapItem)
    } else {
      milestone.bugs.push(roadmapItem)
    }
    if (mappedStatus === 'in_progress') {
      milestone.hasInProgress = true
    }
  }

  // Build milestone objects and categorize
  const active: RoadmapMilestone[] = []
  const upcoming: RoadmapMilestone[] = []
  const shipped: RoadmapMilestone[] = []

  for (const m of milestoneMap.values()) {
    const total = m.features.length + m.bugs.length
    const completed = [...m.features, ...m.bugs].filter(i => i.status === 'done').length

    const milestone: RoadmapMilestone = {
      title: m.title,
      description: m.description,
      dueOn: m.dueOn,
      state: m.state,
      features: m.features,
      bugs: m.bugs,
      progress: { total, completed },
    }

    if (m.state === 'closed') {
      shipped.push(milestone)
    } else if (m.hasInProgress) {
      active.push(milestone)
    } else {
      upcoming.push(milestone)
    }
  }

  // Sort shipped by version (descending) and limit
  shipped.sort((a, b) => b.title.localeCompare(a.title, undefined, { numeric: true }))
  shipped.splice(MAX_SHIPPED_MILESTONES)

  return { active, upcoming, shipped }
}

export async function fetchRoadmapData(): Promise<RoadmapData> {
  const empty: RoadmapData = { active: [], upcoming: [], shipped: [] }

  if (!env.GITHUB_PROJECT_NUMBER) {
    infraLogger.warn`GITHUB_PROJECT_NUMBER not set, roadmap will be empty`
    return empty
  }

  try {
    const data = await octokit.graphql(PROJECT_ITEMS_QUERY, {
      org: GITHUB_ORG,
      number: env.GITHUB_PROJECT_NUMBER,
    })

    return transformProjectItems(data)
  } catch (error) {
    infraLogger.error`Failed to fetch roadmap data: ${error}`
    return empty
  }
}
```

**Step 4: Run the tests to verify they pass**

Run: `cd /Users/kilbot/Projects/wcpos-com/.worktrees/roadmap-page && pnpm test:unit -- src/services/core/external/github-roadmap.test.ts`
Expected: ALL PASS

**Step 5: Run full test suite to check for regressions**

Run: `cd /Users/kilbot/Projects/wcpos-com/.worktrees/roadmap-page && pnpm test:unit`
Expected: ALL PASS (63 existing + new tests)

**Step 6: Commit**

```bash
git add src/services/core/external/github-roadmap.ts src/services/core/external/github-roadmap.test.ts
git commit -m "feat(roadmap): add GitHub Projects data layer with tests"
```

---

### Task 4: Roadmap Page and Components

**Files:**
- Create: `src/app/roadmap/page.tsx`
- Create: `src/components/roadmap/milestone-list.tsx`
- Create: `src/components/roadmap/milestone-section.tsx`
- Create: `src/components/roadmap/feature-card.tsx`
- Create: `src/components/roadmap/bug-fix-list.tsx`

**Step 1: Create the cached data function and page shell**

Create `src/app/roadmap/page.tsx`:

```tsx
import { Suspense } from 'react'
import { cacheLife, cacheTag } from 'next/cache'
import { fetchRoadmapData } from '@/services/core/external/github-roadmap'
import { MilestoneList } from '@/components/roadmap/milestone-list'
import type { RoadmapData } from '@/types/roadmap'

async function getCachedRoadmapData(): Promise<RoadmapData> {
  'use cache'
  cacheLife('roadmap')
  cacheTag('roadmap')
  return fetchRoadmapData()
}

function MilestoneListSkeleton() {
  return (
    <div className="space-y-12">
      {[1, 2].map(i => (
        <div key={i} className="space-y-4">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <div className="h-2 w-full rounded bg-muted animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(j => (
              <div key={j} className="h-32 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function RoadmapPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-3">Roadmap</h1>
        <p className="text-lg text-muted-foreground">
          What we&apos;re building for WooCommerce POS
        </p>
      </div>

      <Suspense fallback={<MilestoneListSkeleton />}>
        <MilestoneListLoader />
      </Suspense>
    </main>
  )
}

async function MilestoneListLoader() {
  const data = await getCachedRoadmapData()
  return <MilestoneList data={data} />
}
```

**Step 2: Create MilestoneList component**

Create `src/components/roadmap/milestone-list.tsx`:

```tsx
import type { RoadmapData } from '@/types/roadmap'
import { MilestoneSection } from './milestone-section'

interface MilestoneListProps {
  data: RoadmapData
}

export function MilestoneList({ data }: MilestoneListProps) {
  const hasContent = data.active.length > 0 || data.upcoming.length > 0 || data.shipped.length > 0

  if (!hasContent) {
    return (
      <p className="text-muted-foreground text-center py-12">
        No roadmap items to display yet.
      </p>
    )
  }

  return (
    <div className="space-y-16">
      {data.active.length > 0 && (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-6">
            In Progress
          </h2>
          <div className="space-y-12">
            {data.active.map(milestone => (
              <MilestoneSection key={milestone.title} milestone={milestone} />
            ))}
          </div>
        </section>
      )}

      {data.upcoming.length > 0 && (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-6">
            Up Next
          </h2>
          <div className="space-y-12">
            {data.upcoming.map(milestone => (
              <MilestoneSection key={milestone.title} milestone={milestone} />
            ))}
          </div>
        </section>
      )}

      {data.shipped.length > 0 && (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-6">
            Recently Shipped
          </h2>
          <div className="space-y-12 opacity-75">
            {data.shipped.map(milestone => (
              <MilestoneSection key={milestone.title} milestone={milestone} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
```

**Step 3: Create MilestoneSection component**

Create `src/components/roadmap/milestone-section.tsx`:

```tsx
import type { RoadmapMilestone } from '@/types/roadmap'
import { Badge } from '@/components/ui/badge'
import { FeatureCard } from './feature-card'
import { BugFixList } from './bug-fix-list'

interface MilestoneSectionProps {
  milestone: RoadmapMilestone
}

export function MilestoneSection({ milestone }: MilestoneSectionProps) {
  const progressPercent = milestone.progress.total > 0
    ? Math.round((milestone.progress.completed / milestone.progress.total) * 100)
    : 0

  const statusVariant = milestone.state === 'closed' ? 'success' as const : 'secondary' as const

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-2xl font-semibold">{milestone.title}</h3>
        <Badge variant={statusVariant}>
          {milestone.state === 'closed' ? 'Shipped' : `${progressPercent}%`}
        </Badge>
      </div>

      {milestone.description && (
        <p className="text-muted-foreground">{milestone.description}</p>
      )}

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Feature cards */}
      {milestone.features.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {milestone.features.map(feature => (
            <FeatureCard key={feature.id} item={feature} />
          ))}
        </div>
      )}

      {/* Bug fixes (collapsible) */}
      {milestone.bugs.length > 0 && (
        <BugFixList bugs={milestone.bugs} />
      )}
    </div>
  )
}
```

**Step 4: Create FeatureCard component**

Create `src/components/roadmap/feature-card.tsx`:

```tsx
import type { RoadmapItem } from '@/types/roadmap'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface FeatureCardProps {
  item: RoadmapItem
}

const statusConfig = {
  planned: { label: 'Planned', variant: 'secondary' as const },
  in_progress: { label: 'In Progress', variant: 'default' as const },
  done: { label: 'Done', variant: 'success' as const },
}

export function FeatureCard({ item }: FeatureCardProps) {
  const status = statusConfig[item.status]

  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
      <Card className="h-full hover:border-primary/50 transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{item.title}</CardTitle>
            <Badge variant={status.variant} className="shrink-0 text-xs">
              {status.label}
            </Badge>
          </div>
          {item.description && (
            <CardDescription className="line-clamp-3">
              {item.description}
            </CardDescription>
          )}
        </CardHeader>
      </Card>
    </a>
  )
}
```

**Step 5: Create BugFixList client component**

Create `src/components/roadmap/bug-fix-list.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { RoadmapItem } from '@/types/roadmap'
import { Badge } from '@/components/ui/badge'

interface BugFixListProps {
  bugs: RoadmapItem[]
}

const statusConfig = {
  planned: { label: 'Planned', variant: 'secondary' as const },
  in_progress: { label: 'In Progress', variant: 'default' as const },
  done: { label: 'Done', variant: 'success' as const },
}

export function BugFixList({ bugs }: BugFixListProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>{bugs.length} bug fix{bugs.length !== 1 ? 'es' : ''} &amp; improvements</span>
        <span className="text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <ul className="border-t divide-y">
          {bugs.map(bug => {
            const status = statusConfig[bug.status]
            return (
              <li key={bug.id}>
                <a
                  href={bug.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
                >
                  <span>{bug.title}</span>
                  <Badge variant={status.variant} className="text-xs">
                    {status.label}
                  </Badge>
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
```

**Step 6: Verify types compile**

Run: `cd /Users/kilbot/Projects/wcpos-com/.worktrees/roadmap-page && pnpm type-check`
Expected: PASS

**Step 7: Run all tests**

Run: `cd /Users/kilbot/Projects/wcpos-com/.worktrees/roadmap-page && pnpm test:unit`
Expected: ALL PASS

**Step 8: Commit**

```bash
git add src/app/roadmap/page.tsx src/components/roadmap/
git commit -m "feat(roadmap): add roadmap page and milestone components"
```

---

### Task 5: Webhook Revalidation Endpoint

**Files:**
- Create: `src/app/api/roadmap/revalidate/route.ts`

**Step 1: Create the webhook route**

Create `src/app/api/roadmap/revalidate/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { env } from '@/utils/env'
import { apiLogger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret')

  if (!env.GITHUB_WEBHOOK_SECRET || secret !== env.GITHUB_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    revalidateTag('roadmap')
    apiLogger.info`Roadmap cache revalidated via webhook`
    return NextResponse.json({ revalidated: true })
  } catch (error) {
    apiLogger.error`Failed to revalidate roadmap cache: ${error}`
    return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 })
  }
}
```

**Step 2: Verify types compile**

Run: `cd /Users/kilbot/Projects/wcpos-com/.worktrees/roadmap-page && pnpm type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/api/roadmap/revalidate/route.ts
git commit -m "feat(roadmap): add webhook endpoint for cache revalidation"
```

---

### Task 6: Build Verification

**Step 1: Run type check**

Run: `cd /Users/kilbot/Projects/wcpos-com/.worktrees/roadmap-page && pnpm type-check`
Expected: PASS

**Step 2: Run linter**

Run: `cd /Users/kilbot/Projects/wcpos-com/.worktrees/roadmap-page && pnpm lint`
Expected: PASS (or only pre-existing warnings)

**Step 3: Run all unit tests**

Run: `cd /Users/kilbot/Projects/wcpos-com/.worktrees/roadmap-page && pnpm test:unit`
Expected: ALL PASS

**Step 4: Run build**

Run: `cd /Users/kilbot/Projects/wcpos-com/.worktrees/roadmap-page && pnpm build`
Expected: PASS — the roadmap page should appear in the build output. Note: the build may warn about `GITHUB_PROJECT_NUMBER` not being set; this is expected in CI/local without env vars configured.

**Step 5: Commit any lint/type fixes if needed, then final commit**

If lint or type-check required changes:

```bash
git add -u
git commit -m "fix(roadmap): address lint and type issues"
```
