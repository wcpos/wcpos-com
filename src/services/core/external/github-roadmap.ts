import 'server-only'

import { getOctokit } from './github-auth'
import { infraLogger } from '@/lib/logger'
import type { Epic, EpicState, Release, RoadmapData } from '@/types/roadmap'

// Public release briefs live here, independently of the internal project board.
const ROADMAP_OWNER = 'wcpos'
const ROADMAP_REPO = 'roadmap'
const RELEASE_LABEL = 'release'
const MAX_SHIPPED_RELEASES = 2
const THEME_MAX_LENGTH = 60

const RELEASE_ISSUES_QUERY = `
  query($owner: String!, $repo: String!, $label: String!, $cursor: String) {
    repository(owner: $owner, name: $repo) {
      issues(labels: [$label], states: [OPEN, CLOSED], first: 50, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          number title url state stateReason closedAt body
          subIssues(first: 100) {
            nodes {
              number title url body state stateReason
              subIssuesSummary { total completed }
            }
          }
        }
      }
    }
  }
`

const emptyRoadmap = (): RoadmapData => ({
  now: null, next: [], later: [], shipped: [],
})
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

function nodes(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  infraLogger.warn('Skipping malformed roadmap nodes')
  return []
}

interface Issue extends Record<string, unknown> {
  number: number
  title: string
  url: string
  body: string | null
  state: 'OPEN' | 'CLOSED'
}

function isIssue(value: unknown): value is Issue {
  const issue = record(value)
  const valid =
    Number.isSafeInteger(issue.number) &&
    typeof issue.title === 'string' &&
    typeof issue.url === 'string' &&
    (issue.body === null || typeof issue.body === 'string') &&
    (issue.state === 'OPEN' || issue.state === 'CLOSED')
  if (!valid) infraLogger.warn('Skipping malformed roadmap issue')
  return valid
}

export function parseReleaseTitle(title: unknown) {
  const match =
    typeof title === 'string' ? /^v(\d+)\.(\d+)\.0 — (.+)$/.exec(title) : null
  if (!match || match[3].length > THEME_MAX_LENGTH) return null
  const major = Number(match[1])
  const minor = Number(match[2])
  if (!Number.isSafeInteger(major) || !Number.isSafeInteger(minor)) return null
  return { version: `v${match[1]}.${match[2]}.0`, major, minor, theme: match[3] }
}

function section(body: string, heading: string): string {
  const lines = body.split('\n')
  const start = lines.indexOf(`### ${heading}`)
  if (start === -1) return ''
  const end = lines.findIndex((line, i) => i > start && line.startsWith('### '))
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n').trim()
}

export function parseReleaseBody(body: unknown) {
  const lines =
    typeof body === 'string' ? body.replace(/\r\n/g, '\n').split('\n') : []
  const divider = lines.indexOf('---')
  const brief = lines.slice(0, divider === -1 ? undefined : divider).join('\n')
  const date = section(brief, 'Due date')
  const dueOn = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null
  if (date && !dueOn) infraLogger.warn('Skipping malformed roadmap due date')
  return {
    dueOn,
    why: section(brief, 'Why this release'),
    notInRelease: section(brief, 'Not in this release'),
    prose: divider === -1 ? '' : lines.slice(divider + 1).join('\n').trim(),
  }
}

export function parseSummary(body: unknown): string {
  return section(typeof body === 'string' ? body.replace(/\r\n/g, '\n') : '', 'Summary')
}

export function deriveEpicState(
  issue: { state: string; stateReason?: unknown },
  completed: number
): EpicState | null {
  if (issue.stateReason === 'COMPLETED') return 'done'
  if (
    issue.state === 'CLOSED' &&
    (issue.stateReason === 'NOT_PLANNED' || issue.stateReason === 'DUPLICATE')
  ) return null
  return issue.state === 'OPEN' && completed > 0 ? 'in_progress' : 'planned'
}

function releaseEpics(value: unknown): Pick<Release, 'epics' | 'hiddenEpicCount'> {
  const epics: Epic[] = []
  let hiddenEpicCount = 0
  for (const issue of nodes(value)) {
    if (!isIssue(issue)) continue
    const counts = record(issue.subIssuesSummary)
    const total = typeof counts.total === 'number' ? counts.total : 0
    const completed = typeof counts.completed === 'number' ? counts.completed : 0
    const state = deriveEpicState(issue, completed)
    if (!state) continue
    const summary = parseSummary(issue.body)
    if (!summary) {
      hiddenEpicCount++
      continue
    }
    if (
      !Number.isSafeInteger(total) || !Number.isSafeInteger(completed) ||
      total < 0 || completed < 0 || completed > total
    ) {
      infraLogger.warn('Skipping malformed roadmap epic progress')
      continue
    }
    epics.push({
      number: issue.number,
      title: issue.title,
      url: issue.url,
      summary,
      state,
      ...(total > 0 ? { progress: { completed, total } } : {}),
    })
  }
  const order: Record<EpicState, number> = { in_progress: 0, planned: 1, done: 2 }
  epics.sort((a, b) => order[a.state] - order[b.state])
  return { epics, hiddenEpicCount }
}

export function transformReleaseIssues(data: unknown): RoadmapData {
  try {
    const issues = record(record(record(data).repository).issues)
    const open: Release[] = []
    const shipped: Release[] = []
    for (const issue of nodes(issues.nodes)) {
      if (!isIssue(issue)) continue
      const title = parseReleaseTitle(issue.title)
      if (!title) {
        infraLogger.warn`Skipping roadmap release with invalid title: ${issue.number}`
        continue
      }
      if (issue.state === 'CLOSED' && issue.stateReason !== 'COMPLETED') continue
      const release: Release = {
        ...title,
        ...parseReleaseBody(issue.body),
        url: issue.url,
        ...releaseEpics(record(issue.subIssues).nodes),
        shippedOn:
          issue.state === 'CLOSED' && typeof issue.closedAt === 'string'
            ? issue.closedAt : null,
      }
      if (issue.state === 'CLOSED') shipped.push(release)
      else open.push(release)
    }
    const byVersion = (a: Release, b: Release) =>
      a.major - b.major || a.minor - b.minor
    open.sort(byVersion)
    shipped.sort((a, b) => byVersion(b, a))
    const now = open.shift() ?? null
    return {
      now,
      next: open.filter((r) => r.dueOn),
      later: open.filter((r) => !r.dueOn),
      shipped: shipped.slice(0, MAX_SHIPPED_RELEASES),
    }
  } catch (error) {
    infraLogger.error`Failed to transform roadmap data: ${error}`
    return emptyRoadmap()
  }
}

export async function fetchRoadmapData(): Promise<RoadmapData> {
  let result = emptyRoadmap()
  try {
    const octokit = getOctokit()
    let cursor: string | null = null
    const allNodes: unknown[] = []
    do {
      const data: unknown = await octokit.graphql(RELEASE_ISSUES_QUERY, {
        owner: ROADMAP_OWNER,
        repo: ROADMAP_REPO,
        label: RELEASE_LABEL,
        cursor,
        headers: { 'GraphQL-Features': 'sub_issues' },
      })
      const issues = record(record(record(data).repository).issues)
      const pageInfo = record(issues.pageInfo)
      if (!Array.isArray(issues.nodes) || typeof pageInfo.hasNextPage !== 'boolean') {
        throw new Error('Malformed roadmap response')
      }
      allNodes.push(...issues.nodes)
      if (!pageInfo.hasNextPage) break
      if (
        typeof pageInfo.endCursor !== 'string' ||
        !pageInfo.endCursor || pageInfo.endCursor === cursor
      ) {
        throw new Error('Malformed roadmap pagination cursor')
      }
      cursor = pageInfo.endCursor
    } while (cursor)
    result = transformReleaseIssues({ repository: { issues: { nodes: allNodes } } })
  } catch (error) {
    infraLogger.error`Failed to fetch roadmap data: ${error}`
  }
  if (
    process.env.NODE_ENV === 'production' &&
    !result.now && !result.next.length && !result.later.length && !result.shipped.length
  ) {
    infraLogger.error('Roadmap rendered empty')
  }
  return result
}
