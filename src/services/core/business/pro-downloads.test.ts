import { describe, expect, it, vi } from 'vitest'
import {
  normalizeReleaseVersion,
  getProPluginReleases,
  getProPluginPrereleases,
} from './pro-downloads'

describe('normalizeReleaseVersion', () => {
  it('removes a leading v prefix', () => {
    expect(normalizeReleaseVersion('v1.2.3')).toBe('1.2.3')
  })
})

const mockGetReleases = vi.hoisted(() => vi.fn())
vi.mock('@/services/core/external/github-client', () => ({
  githubClient: { getReleases: mockGetReleases },
}))

it('keeps stable and prerelease feeds separate, sorted, and zip-only', async () => {
  const asset = { name: 'woocommerce-pos-pro.zip', url: 'https://api.github.com/asset', browser_download_url: 'https://example.com/pro.zip' }
  const release = (tagName: string, publishedAt: string, prerelease = false) => ({
    tagName, publishedAt, prerelease, draft: false, name: tagName,
    body: 'Release notes', assets: [asset],
  })
  mockGetReleases.mockResolvedValue([
    release('v1.8.0', '2026-01-01'),
    release('v2.0.0-beta.1', '2026-11-02', true),
    release('v1.9.0', '2026-02-01'),
    release('v2.0.0-beta.2', '2026-11-03', true),
    ...[false, true].flatMap((prerelease) => [
      { ...release('v9.0.0', '2026-12-01', prerelease), draft: true },
      { ...release('v8.0.0', '2026-12-01', prerelease), assets: [] },
      { ...release('v7.0.0', '2026-12-01', prerelease), assets: [{ ...asset, name: 'source.zip' }] },
    ]),
  ])
  const stable = await getProPluginReleases()
  const beta = await getProPluginPrereleases()
  expect(stable.map((r) => [r.version, r.prerelease])).toEqual([['1.9.0', false], ['1.8.0', false]])
  expect(beta.map((r) => [r.version, r.prerelease])).toEqual([['2.0.0-beta.2', true], ['2.0.0-beta.1', true]])
  expect(beta[1]).toMatchObject({
    tagName: 'v2.0.0-beta.1', name: 'v2.0.0-beta.1', publishedAt: '2026-11-02',
    releaseNotes: 'Release notes', contentLocale: 'en', assetName: asset.name,
    assetApiUrl: asset.url, assetUrl: asset.browser_download_url,
  })
  expect(mockGetReleases).toHaveBeenCalledWith('woocommerce-pos-pro')
})
