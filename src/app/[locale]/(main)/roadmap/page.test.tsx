import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import RoadmapPage from './page'

// The timeline loader is async; render the Suspense fallback instead.
vi.mock('react', async (importActual) => {
  const actual = await importActual<typeof import('react')>()
  return {
    ...actual,
    Suspense: ({
      fallback,
    }: {
      children?: React.ReactNode
      fallback?: React.ReactNode
    }) => <>{fallback}</>,
  }
})

vi.mock('next-intl/server', () => ({
  getMessages: vi.fn(async () => ({})),
  getTranslations: vi.fn(async () => (key: string) => `Translated ${key}`),
  setRequestLocale: vi.fn(),
}))

// CtaSection and BoardLinkChip read their copy through useTranslations.
vi.mock('next-intl', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next-intl')>()),
  NextIntlClientProvider: ({ children }: React.PropsWithChildren) => (
    <>{children}</>
  ),
  useTranslations: () => (key: string) => `Translated CTA ${key}`,
}))

vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

vi.mock('@/services/core/external/github-roadmap', () => ({
  fetchRoadmapData: vi.fn(async () => ({
    now: null,
    next: [],
    later: [],
    shipped: [],
  })),
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const params = Promise.resolve({ locale: 'en' })

describe('RoadmapPage', () => {
  it('ends with the demo and download band after the timeline', async () => {
    const { container } = render(await RoadmapPage({ params }))

    const main = container.querySelector('main')!
    const timeline = main.querySelector('.max-w-3xl')!
    const band = main.lastElementChild!
    expect(band).not.toBe(timeline)
    expect(
      timeline.compareDocumentPosition(band) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()

    const actions = [...band.querySelectorAll('a')].map((a) =>
      a.getAttribute('href')
    )
    expect(actions).toEqual([
      'https://demo.wcpos.com/pos',
      '/downloads',
      '/compare',
    ])
  })
})
