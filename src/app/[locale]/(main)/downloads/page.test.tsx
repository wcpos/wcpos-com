import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, cleanup, render, screen } from '@testing-library/react'

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
  }) => <a href={href}>{children}</a>,
}))

vi.mock('@/components/analytics/tracked-locale-link', () => ({
  TrackedLocaleLink: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

vi.mock('@/services/core/external/github-client', () => ({
  getReleases: vi.fn(async () => []),
}))

vi.mock('@/services/core/external/versions-client', () => ({
  PRODUCT_LABELS: { desktop: 'desktop', free: 'free' },
  getProductVersions: vi.fn(async () => ({})),
  versionFor: vi.fn(() => '1.2.3'),
}))

vi.mock('motion/react', async () => {
  const React = await import('react')

  return {
    motion: {
      div: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) =>
        React.createElement('div', props, children),
    },
    useAnimationFrame: vi.fn(),
    useMotionValue: vi.fn(() => ({ get: () => 0 })),
    useReducedMotion: vi.fn(() => false),
    useSpring: vi.fn(() => ({ set: vi.fn() })),
  }
})

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/downloads')
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('DownloadsPage', () => {
  it('renders the tile-selector hero on the default page', async () => {
    const { default: DownloadsPage } = await import(
      '@/app/[locale]/(main)/downloads/page'
    )

    render(await DownloadsPage({ params: Promise.resolve({ locale: 'en' }) }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'One till, every device.' }),
    ).toBeInTheDocument()
  })

  it('renders the static how-it-fits section by default', async () => {
    const { default: DownloadsPage } = await import(
      '@/app/[locale]/(main)/downloads/page'
    )

    render(await DownloadsPage({ params: Promise.resolve({ locale: 'en' }) }))

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'One store at the centre. Every till in sync.',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Mix — drift + shaded spheres'),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Original — static')).not.toBeInTheDocument()
  })
})

describe('HowItFitsLab', () => {
  it.each([
    ['orbit', 'Orbit — satellites circle, 3D tilt'],
    ['fling', 'Fling — grab, throw, spring back'],
  ])('renders the advertised %s variant', async (variant, label) => {
    window.history.replaceState(null, '', `/downloads?variant=${variant}`)
    const { HowItFitsLab } = await import(
      '@/components/downloads/how-it-fits-lab'
    )

    render(<HowItFitsLab />)

    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('does not install the hidden switcher key handler in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    window.history.replaceState(null, '', '/downloads?variant=float')
    const { HowItFitsLab } = await import(
      '@/components/downloads/how-it-fits-lab'
    )

    render(<HowItFitsLab />)
    fireEvent.keyDown(window, { key: 'ArrowRight' })

    expect(window.location.search).toBe('?variant=float')
  })

  it('renders the static fallback when reduced motion is requested', async () => {
    window.history.replaceState(null, '', '/downloads?variant=orbit')
    const motionReact = await import('motion/react')
    vi.mocked(motionReact.useReducedMotion).mockReturnValue(true)
    const { HowItFitsLab } = await import(
      '@/components/downloads/how-it-fits-lab'
    )

    const { container } = render(<HowItFitsLab />)

    expect(container.querySelector('.wcpos-flow-line')).toBeInTheDocument()
    expect(container.querySelector('.hif-lab-flow')).not.toBeInTheDocument()
  })
})
