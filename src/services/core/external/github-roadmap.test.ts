import { readFileSync } from 'node:fs'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import response from './__fixtures__/roadmap/graphql.json'

vi.mock('server-only', () => ({}))
const { graphql, getOctokit, warn, error } = vi.hoisted(() => ({
  graphql: vi.fn(), getOctokit: vi.fn(), warn: vi.fn(), error: vi.fn(),
}))
vi.mock('./github-auth', () => ({ getOctokit }))
vi.mock('@/lib/logger', () => ({ infraLogger: { warn, error } }))

import { fetchRoadmapData, parseReleaseTitle, parseReleaseBody, parseSummary, transformReleaseIssues } from './github-roadmap'

const EMPTY = { now: null, next: [], later: [], shipped: [] }
function fixture(name: string) {
  const text = readFileSync(`${process.cwd()}/src/services/core/external/__fixtures__/roadmap/${name}.md`, 'utf8')
  const [title, ...body] = text.split('\n')
  return { ...response.repository.issues.nodes[0], title: title.slice(2), body: body.join('\n'), subIssues: { nodes: [] } }
}
const transform = (nodes: unknown[]) => transformReleaseIssues({ repository: { issues: { nodes } } })

beforeEach(() => {
  vi.resetAllMocks()
  getOctokit.mockReturnValue({ graphql })
})
afterEach(() => vi.unstubAllEnvs())

describe('release parsing', () => {
  it('parses the strict version and theme', () => {
    expect(parseReleaseTitle(fixture('valid-release').title)).toEqual({ version: 'v1.11.0', major: 1, minor: 11, theme: 'Checkout & payments' })
    expect(parseReleaseTitle(`v1.2.0 — ${'a'.repeat(60)}`)).not.toBeNull()
    for (const title of [fixture('malformed-title').title, `v1.2.0 — ${'a'.repeat(61)}`, 'v1.2.1 — Patch', 'v1.2.0—Theme', null]) {
      expect(parseReleaseTitle(title)).toBeNull()
    }
  })
  it('warns once per invalid release title and skips it', () => {
    expect(transform([fixture('malformed-title')])).toEqual(EMPTY)
    expect(warn).toHaveBeenCalledTimes(1)
  })
  it('extracts markdown sections and prose without truncation', () => {
    expect(parseReleaseBody(fixture('valid-release').body)).toEqual({
      dueOn: '2026-10-01', why: '**Faster checkout** for busy shops.\n\n- Split payments\n- Clear totals',
      notInRelease: '- Fiscal compliance', prose: 'Public context with [details](https://github.com/wcpos/roadmap).\n\n### More context\nKeep this prose heading.',
    })
    expect(parseReleaseBody('### Why this release\r\nKeep\r\n---\r\n### Due date\r\n2026-12-01').dueOn).toBeNull()
    expect(parseReleaseBody('### Why this release\nKeep\n--- \nStill brief').why).toContain('Still brief')
  })
  it('handles missing and malformed dates and sections', () => {
    expect(parseReleaseBody(fixture('missing-section').body)).toEqual({ dueOn: '2026-11-01', why: '', notInRelease: '', prose: '' })
    expect(parseReleaseBody(fixture('dateless-release').body).dueOn).toBeNull()
    expect(warn).not.toHaveBeenCalled()
    expect(parseReleaseBody(fixture('malformed-date').body).dueOn).toBeNull()
    expect(parseReleaseBody('### Due date\n2026-02-31').dueOn).toBeNull()
    expect(parseReleaseBody('### Due date\n2026-13-01').dueOn).toBeNull()
    expect(parseReleaseBody('### Due date\n2028-02-29').dueOn).toBe('2028-02-29')
    // one warning per malformed date: the fixture, 2026-02-31, 2026-13-01
    expect(warn).toHaveBeenCalledTimes(3)
  })
  it('extracts the full Summary through the next heading, not a horizontal rule', () => {
    expect(parseSummary(fixture('epic-with-summary').body)).toBe('Accept **cash and card** on one order.\n\n- Keep every payment visible\n- Show the remaining balance')
    expect(parseSummary(fixture('epic-without-summary').body)).toBe('')
    expect(parseSummary('### Summary\nFirst\n---\nSecond\n### Other\nStop')).toBe('First\n---\nSecond')
    expect(parseSummary(null)).toBe('')
  })
})

describe('transformReleaseIssues', () => {
  it('transforms the GraphQL fixture without mutating it', () => {
    const before = structuredClone(response)
    expect(transformReleaseIssues(response).now).toMatchObject({ version: 'v1.11.0', hiddenEpicCount: 0, epics: [{ state: 'in_progress', progress: { completed: 1, total: 4 } }] })
    expect(response).toEqual(before)
  })
  it('sorts versions numerically, chooses now, groups dated and dateless releases, excludes withdrawn and caps shipped', () => {
    const release = fixture('valid-release')
    const shipped = [8, 10, 9].map(minor => ({ ...release, title: `v1.${minor}.0 — Shipped`, state: 'CLOSED', stateReason: 'COMPLETED', closedAt: '2026-09-01T00:00:00Z' }))
    const result = transform([fixture('dateless-release'), fixture('missing-section'), ...shipped, release,
      { ...fixture('withdrawn-release'), state: 'CLOSED', stateReason: 'NOT_PLANNED' },
      { ...release, title: 'v0.1.0 — Closed', state: 'CLOSED', stateReason: null },
      { ...release, title: 'v1.13.0 — Soon' }, { ...release, title: 'v3.0.0 — Future', body: '' },
    ])
    expect(result.now?.version).toBe('v1.11.0')
    expect(result.next.map(r => r.version)).toEqual(['v1.12.0', 'v1.13.0'])
    expect(result.later.map(r => r.version)).toEqual(['v2.0.0', 'v3.0.0'])
    expect(result.shipped.map(r => r.version)).toEqual(['v1.10.0', 'v1.9.0'])
    expect(result.shipped[0].shippedOn).toBe('2026-09-01T00:00:00Z')
    expect(transform([fixture('dateless-release')]).now?.version).toBe('v2.0.0')
  })
  it('derives and stably orders epic states, omits zero progress and counts only missing summaries as hidden', () => {
    const epic = { ...fixture('epic-with-summary'), subIssuesSummary: { total: 4, completed: 0 } }
    const nodes = [
      { ...epic, number: 1, state: 'CLOSED', stateReason: 'COMPLETED' },
      { ...epic, number: 2, subIssuesSummary: { total: 0, completed: 0 } },
      { ...epic, number: 3, subIssuesSummary: { total: 4, completed: 2 } },
      { ...epic, number: 4 }, { ...epic, number: 5, subIssuesSummary: { total: 4, completed: 1 } },
      fixture('epic-without-summary'), { ...epic, body: '' },
      { ...fixture('duplicate-closed-epic'), state: 'CLOSED', stateReason: 'DUPLICATE' },
      { ...epic, state: 'CLOSED', stateReason: 'NOT_PLANNED', body: '' },
    ]
    const release = transform([{ ...fixture('valid-release'), subIssues: { nodes } }]).now!
    expect(release.epics.map(e => [e.number, e.state])).toEqual([[3, 'in_progress'], [5, 'in_progress'], [2, 'planned'], [4, 'planned'], [1, 'done']])
    expect(release.epics[2].progress).toBeUndefined()
    expect(release.hiddenEpicCount).toBe(2)
  })
  it('skips malformed issues and epics without losing valid neighbors', () => {
    const release = fixture('valid-release')
    const result = transform([null, 42, { ...release, body: {} }, { ...release, subIssues: { nodes: [null, { title: 4 }] } }, release])
    expect(result.now?.version).toBe('v1.11.0')
    expect(result.next).toHaveLength(1)
    expect(warn).toHaveBeenCalled()
  })
  it.each([null, undefined, {}, { repository: { issues: { nodes: {} } } }])('returns empty for malformed input %j', data => {
    expect(transformReleaseIssues(data)).toEqual(EMPTY)
  })
})

describe('fetchRoadmapData', () => {
  it('uses the release query, constants and feature header', async () => {
    graphql.mockResolvedValue(response)
    expect((await fetchRoadmapData()).now?.version).toBe('v1.11.0')
    expect(graphql).toHaveBeenCalledWith(expect.stringContaining('states: [OPEN, CLOSED]'), {
      owner: 'wcpos', repo: 'roadmap', label: 'release', cursor: null, headers: { 'GraphQL-Features': 'sub_issues' },
    })
  })
  it('paginates issues', async () => {
    graphql.mockResolvedValueOnce({ repository: { issues: { ...response.repository.issues, pageInfo: { hasNextPage: true, endCursor: 'cursor1' } } } })
      .mockResolvedValueOnce({ repository: { issues: { nodes: [fixture('dateless-release')], pageInfo: { hasNextPage: false, endCursor: null } } } })
    expect((await fetchRoadmapData()).later[0].version).toBe('v2.0.0')
    expect(graphql).toHaveBeenCalledTimes(2)
    expect(graphql).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ cursor: 'cursor1' }))
  })
  it('renders the first 100 epics of an oversized release and warns', async () => {
    const release = response.repository.issues.nodes[0]
    graphql.mockResolvedValueOnce({
      repository: {
        issues: {
          nodes: [{
            ...release,
            subIssues: {
              ...release.subIssues,
              pageInfo: { hasNextPage: true, endCursor: 'epic-cursor' },
            },
          }],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    })

    const result = await fetchRoadmapData()
    expect(result.now?.version).toBe('v1.11.0')
    expect(warn.mock.calls.flat(2).join('')).toContain('exceeds the 100-epic limit')
  })
  it('returns empty and logs API and auth failures', async () => {
    graphql.mockRejectedValueOnce(new Error('API failure'))
    expect(await fetchRoadmapData()).toEqual(EMPTY)
    getOctokit.mockImplementationOnce(() => { throw new Error('Auth failure') })
    expect(await fetchRoadmapData()).toEqual(EMPTY)
    expect(error).toHaveBeenCalledTimes(2)
  })
  it('rejects a malformed page and discards partial data on failure', async () => {
    graphql.mockResolvedValueOnce({ repository: { issues: { ...response.repository.issues, pageInfo: { hasNextPage: true, endCursor: 'cursor1' } } } }).mockResolvedValueOnce(null)
    expect(await fetchRoadmapData()).toEqual(EMPTY)
    expect(error).toHaveBeenCalled()
  })
  it('logs a production empty roadmap as an error, including failures', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    graphql.mockResolvedValueOnce({ repository: { issues: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } } })
    expect(await fetchRoadmapData()).toEqual(EMPTY)
    expect(error).toHaveBeenCalledWith('Roadmap rendered empty')
    error.mockClear()
    graphql.mockRejectedValueOnce(new Error('API failure'))
    await fetchRoadmapData()
    expect(error).toHaveBeenCalledWith('Roadmap rendered empty')
  })
  it('does not emit the empty alert in development or for populated production data', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    graphql.mockResolvedValueOnce({ repository: { issues: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } } })
    await fetchRoadmapData()
    vi.stubEnv('NODE_ENV', 'production')
    graphql.mockResolvedValueOnce(response)
    await fetchRoadmapData()
    expect(error).not.toHaveBeenCalled()
  })
})
