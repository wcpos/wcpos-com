import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import enMessages from '../../../../../messages/en.json'
import { formatDateForLocale } from '@/lib/date-format'
import { getReleases } from '@/services/core/external/github-client'
import type { GitHubReleaseInfo } from '@/types/github'
import ChangelogPage, { generateMetadata } from './page'

function readMessage(messages: Record<string, unknown>, namespace: string, key: string) {
  return `${namespace}.${key}`
    .split('.')
    .reduce<unknown>(
      (value, part) =>
        value && typeof value === 'object'
          ? (value as Record<string, unknown>)[part]
          : undefined,
      messages,
    ) as string
}

vi.mock('next-intl/server', async () => {
  const messages = (await import('../../../../../messages/en.json')).default
  return {
    setRequestLocale: vi.fn(),
    getTranslations: vi.fn(
      async ({ namespace }: { locale: string; namespace: string }) =>
        (key: string) => readMessage(messages, namespace, key),
    ),
  }
})

vi.mock('@/services/core/external/github-client', () => ({
  getReleases: vi.fn(async () => []),
}))

const published: GitHubReleaseInfo[] = Array.from({ length: 12 }, (_, index) => ({
  tagName: `v1.8.${index + 1}`,
  name: `1.8.${index + 1}`,
  body: `- Note for 1.8.${index + 1}`,
  publishedAt: `2026-01-${String(index + 1).padStart(2, '0')}T12:00:00Z`,
  draft: false,
  prerelease: false,
  assets: [],
}))

describe('ChangelogPage', () => {
  beforeEach(() => {
    vi.mocked(getReleases).mockReset()
  })

  it('shows only the ten newest published plugin releases in date order', async () => {
    vi.mocked(getReleases).mockResolvedValue([
      ...published,
      {
        ...published[0],
        tagName: 'v9.9.9-draft',
        publishedAt: '2026-02-01T12:00:00Z',
        draft: true,
      },
      {
        ...published[0],
        tagName: 'v9.9.9-beta.1',
        publishedAt: '2026-02-02T12:00:00Z',
        prerelease: true,
      },
    ])

    const { container } = render(
      await ChangelogPage({ params: Promise.resolve({ locale: 'en' }) }),
    )

    expect(getReleases).toHaveBeenCalledWith('woocommerce-pos')
    expect(screen.getByRole('heading', { level: 1, name: 'WCPOS Changelog' }))
      .toBeInTheDocument()
    expect(screen.getByText(enMessages.changelog.page.description))
      .toBeInTheDocument()
    const rows = Array.from(container.querySelectorAll('summary'))
    expect(rows).toHaveLength(10)
    expect(rows.map((row) => within(row).getByText(/^1\.8\.\d+$/).textContent))
      .toEqual([
        '1.8.12', '1.8.11', '1.8.10', '1.8.9', '1.8.8',
        '1.8.7', '1.8.6', '1.8.5', '1.8.4', '1.8.3',
      ])
    for (const version of ['1.8.2', '1.8.1', '9.9.9-draft', '9.9.9-beta.1']) {
      expect(screen.queryByText(version)).not.toBeInTheDocument()
    }
    expect(screen.getByText(formatDateForLocale(published[11].publishedAt, 'en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }))).toBeInTheDocument()
    expect(screen.getByText('Note for 1.8.12')).toBeInTheDocument()
  })

  it('renders each release entry as an h2 under the page h1', async () => {
    vi.mocked(getReleases).mockResolvedValue([
      ...published,
      {
        ...published[0],
        tagName: 'v9.9.9-draft',
        publishedAt: '2026-02-01T12:00:00Z',
        draft: true,
      },
      {
        ...published[0],
        tagName: 'v9.9.9-beta.1',
        publishedAt: '2026-02-02T12:00:00Z',
        prerelease: true,
      },
    ])

    render(await ChangelogPage({ params: Promise.resolve({ locale: 'en' }) }))

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const headings = screen.getAllByRole('heading', { level: 2 })
    expect(headings).toHaveLength(10)
    const versions = [
      '1.8.12', '1.8.11', '1.8.10', '1.8.9', '1.8.8',
      '1.8.7', '1.8.6', '1.8.5', '1.8.4', '1.8.3',
    ]
    headings.forEach((heading, index) => {
      expect(heading.textContent?.startsWith(versions[index])).toBe(true)
      expect(heading.closest('summary')).not.toBeNull()
    })
  })

  it('renders the heading without version rows when no releases are returned', async () => {
    vi.mocked(getReleases).mockResolvedValue([])

    const { container } = render(
      await ChangelogPage({ params: Promise.resolve({ locale: 'en' }) }),
    )

    expect(screen.getByRole('heading', { level: 1, name: 'WCPOS Changelog' }))
      .toBeInTheDocument()
    expect(container.querySelectorAll('summary')).toHaveLength(0)
  })

  it('uses the changelog metadata title', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'en' }),
    })

    expect(metadata.title).toBe(enMessages.changelog.meta.title)
  })

  it('names the product in the en metadata title and description', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'en' }),
    })

    expect(metadata.title).toBe('Changelog & Release Notes: Point of Sale for WooCommerce')
    expect(metadata.description).toBe(
      'Release notes for the latest published versions of WCPOS, the free point of sale plugin for WooCommerce, straight from GitHub.',
    )
  })
})

// Old meta.title values: each locale must have replaced its bare "Changelog" title.
const CHANGELOG_META = [
  { locale: 'en', titleMax: 62, descriptionMax: 155, oldTitle: 'Changelog' },
  { locale: 'de', titleMax: 62, descriptionMax: 160, oldTitle: 'Änderungsprotokoll' },
  { locale: 'nl', titleMax: 62, descriptionMax: 160, oldTitle: 'Wijzigingslogboek' },
  { locale: 'fr', titleMax: 62, descriptionMax: 160, oldTitle: 'Journal des modifications' },
  { locale: 'es', titleMax: 62, descriptionMax: 160, oldTitle: 'Registro de cambios' },
  { locale: 'it', titleMax: 62, descriptionMax: 160, oldTitle: 'Registro delle modifiche' },
  { locale: 'pt', titleMax: 62, descriptionMax: 160, oldTitle: 'Registo de alterações' },
  { locale: 'ja', titleMax: 32, descriptionMax: 100, oldTitle: '変更履歴' },
  { locale: 'ko', titleMax: 32, descriptionMax: 100, oldTitle: '변경 기록' },
  { locale: 'zh', titleMax: 32, descriptionMax: 100, oldTitle: '更新日志' },
] as const

describe('changelog.meta in every locale', () => {
  it.each(CHANGELOG_META)(
    '$locale title and description fit and replace the old title',
    ({ locale, titleMax, descriptionMax, oldTitle }) => {
      const { title, description } = (
        JSON.parse(readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8')) as {
          changelog: { meta: { title: string; description: string } }
        }
      ).changelog.meta
      expect([...title].length).toBeLessThanOrEqual(titleMax)
      expect([...description].length).toBeLessThanOrEqual(descriptionMax)
      expect(title).not.toBe(oldTitle)
    },
  )
})
