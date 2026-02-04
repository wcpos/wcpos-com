import 'server-only'

import { getOctokit } from './github-auth'
import { env } from '@/utils/env'
import { infraLogger } from '@/lib/logger'
import type { RoadmapData, RoadmapItem, RoadmapMilestone, RoadmapStatus, RoadmapItemType } from '@/types/roadmap'

const octokit = getOctokit()

const GITHUB_ORG = 'wcpos'
const ALLOWED_REPOS = ['woocommerce-pos', 'woocommerce-pos-pro', 'monorepo', 'electron']
const FEATURE_LABELS = ['enhancement', 'ui']
const BUG_LABELS = ['bug']
const PUBLIC_LABELS = [...FEATURE_LABELS, ...BUG_LABELS]

const STATUS_MAP: Record<string, RoadmapStatus | null> = {
  'Triage': null,
  'Backlog': null,
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

    if (!content.milestone) continue

    const repoName = content.repository?.name
    if (!repoName || !ALLOWED_REPOS.includes(repoName)) continue

    const labels: string[] = (content.labels?.nodes ?? []).map((l: { name: string }) => l.name)
    const hasPublicLabel = labels.some(l => PUBLIC_LABELS.includes(l))
    if (!hasPublicLabel) continue

    const statusName = item.fieldValueByName?.name ?? ''
    const mappedStatus = STATUS_MAP[statusName]
    if (!mappedStatus) continue

    const isFeature = labels.some(l => FEATURE_LABELS.includes(l))
    const type: RoadmapItemType = isFeature ? 'feature' : 'bug'

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
