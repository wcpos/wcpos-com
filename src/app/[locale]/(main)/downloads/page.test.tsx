import { cleanup, render, screen } from '@testing-library/react'
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => React.createElement('a', { href }, children),
}))

vi.mock('@/components/analytics/tracked-locale-link', () => ({
  TrackedLocaleLink: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => React.createElement('a', { href }, children),
}))

vi.mock('@/services/core/external/github-client', () => ({
  getReleases: vi.fn(async () => []),
}))

vi.mock('@/services/core/external/versions-client', () => ({
  PRODUCT_LABELS: {
    desktop: 'desktop',
    free: 'free',
  },
  getProductVersions: vi.fn(async () => ({})),
  versionFor: vi.fn(() => '1.2.3'),
}))

describe('DownloadsPage hero prototype gate', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test')
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllEnvs()
  })

  async function renderDownloadsPage(
    searchParams: Record<string, string | string[] | undefined> = {},
  ) {
    const { default: DownloadsPage } = await import('./page')

    render(
      await DownloadsPage({
        params: Promise.resolve({ locale: 'en' }),
        searchParams: Promise.resolve(searchParams),
      } as never),
    )
  }

  it('keeps the production hero by default', async () => {
    await renderDownloadsPage()

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Take orders on any device.',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        level: 1,
        name: 'One till, every device.',
      }),
    ).not.toBeInTheDocument()
  })

  it('shows the prototype hero only for the opt-in variant outside production', async () => {
    await renderDownloadsPage({ variant: 'hero' })

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'One till, every device.',
      }),
    ).toBeInTheDocument()
  })

  it('keeps the production hero in production even with the prototype variant', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    await renderDownloadsPage({ variant: 'hero' })

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Take orders on any device.',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        level: 1,
        name: 'One till, every device.',
      }),
    ).not.toBeInTheDocument()
  })
})
