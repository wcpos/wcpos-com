import { describe, expect, it } from 'vitest'
import type { GitHubReleaseInfo } from '@/types/github'
import { selectPublishedReleases } from './published-releases'

const releases: GitHubReleaseInfo[] = Array.from({ length: 12 }, (_, index) => ({
  tagName: `v1.8.${index + 1}`,
  name: `1.8.${index + 1}`,
  body: `- Note for 1.8.${index + 1}`,
  publishedAt: `2026-01-${String(index + 1).padStart(2, '0')}T12:00:00Z`,
  draft: false,
  prerelease: false,
  assets: [],
}))

describe('selectPublishedReleases', () => {
  it('drops drafts and prereleases', () => {
    const draft = { ...releases[0], draft: true }
    const prerelease = { ...releases[1], prerelease: true }

    expect(selectPublishedReleases([draft, releases[2], prerelease], 10))
      .toEqual([releases[2]])
  })

  it('sorts unordered releases newest-first by publication date', () => {
    expect(selectPublishedReleases([releases[1], releases[0], releases[2]], 10))
      .toEqual([releases[2], releases[1], releases[0]])
  })

  it('limits the result to the ten newest published releases', () => {
    const selected = selectPublishedReleases(releases, 10)

    expect(selected).toHaveLength(10)
    expect(selected.map((release) => release.tagName)).toEqual([
      'v1.8.12', 'v1.8.11', 'v1.8.10', 'v1.8.9', 'v1.8.8',
      'v1.8.7', 'v1.8.6', 'v1.8.5', 'v1.8.4', 'v1.8.3',
    ])
  })

  it('does not mutate the input array or its releases', () => {
    const input = releases.map((release) => ({ ...release, assets: [] }))
    const original = structuredClone(input)

    selectPublishedReleases(input, 10)

    expect(input).toEqual(original)
  })
})
