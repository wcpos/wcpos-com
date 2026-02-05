import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'

// Mock medusa-auth before importing the component
vi.mock('@/lib/medusa-auth', () => ({
  getAuthToken: vi.fn(),
}))

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      docs: 'Docs',
      roadmap: 'Roadmap',
      pro: 'Pro',
      support: 'Support',
    }
    return translations[key] ?? key
  },
}))

// Mock i18n navigation Link as a simple anchor
vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

import { getAuthToken } from '@/lib/medusa-auth'
import { SiteHeader } from './site-header'

const mockGetAuthToken = vi.mocked(getAuthToken)

describe('SiteHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the WCPOS logo link', async () => {
    mockGetAuthToken.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    const logos = screen.getAllByText('WCPOS')
    expect(logos.length).toBeGreaterThan(0)

    const logoLink = logos[0].closest('a')
    expect(logoLink?.getAttribute('href')).toBe('/')
  })

  it('renders desktop nav links', async () => {
    mockGetAuthToken.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    expect(screen.getAllByText('Docs').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Roadmap').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pro').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Support').length).toBeGreaterThan(0)
  })

  it('links Docs to external URL', async () => {
    mockGetAuthToken.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    const docsLinks = screen.getAllByText('Docs')
    const docsLink = docsLinks[0].closest('a')
    expect(docsLink?.getAttribute('href')).toBe('https://docs.wcpos.com')
  })

  it('links Roadmap to /roadmap', async () => {
    mockGetAuthToken.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    const roadmapLinks = screen.getAllByText('Roadmap')
    const roadmapLink = roadmapLinks[0].closest('a')
    expect(roadmapLink?.getAttribute('href')).toBe('/roadmap')
  })

  it('links Support to /support', async () => {
    mockGetAuthToken.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    const supportLinks = screen.getAllByText('Support')
    const supportLink = supportLinks[0].closest('a')
    expect(supportLink?.getAttribute('href')).toBe('/support')
  })

  it('adds umami event attribute to Pro link', async () => {
    mockGetAuthToken.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    const proLinks = screen.getAllByText('Pro')
    const proLink = proLinks[0].closest('a')
    expect(proLink?.getAttribute('data-umami-event')).toBe('click-pro-cta')
  })

  it('shows Sign In when not authenticated', async () => {
    mockGetAuthToken.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    const signInLinks = screen.getAllByText('Sign In')
    expect(signInLinks.length).toBeGreaterThan(0)
  })

  it('shows Account link when authenticated', async () => {
    mockGetAuthToken.mockResolvedValue('fake-token')
    await act(async () => {
      render(<SiteHeader />)
    })

    const accountLinks = screen.getAllByText('Account')
    expect(accountLinks.length).toBeGreaterThan(0)
  })

  it('adds umami event attribute to Sign In button', async () => {
    mockGetAuthToken.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    const signInLinks = screen.getAllByText('Sign In')
    // The Button component uses asChild with Slot, so data-umami-event
    // gets forwarded to the rendered anchor element
    const signInEl = signInLinks[0].closest('[data-umami-event]')
    expect(signInEl?.getAttribute('data-umami-event')).toBe('click-sign-in')
  })

  it('links Account to /account', async () => {
    mockGetAuthToken.mockResolvedValue('fake-token')
    await act(async () => {
      render(<SiteHeader />)
    })

    const accountLinks = screen.getAllByText('Account')
    const accountLink = accountLinks[0].closest('a')
    expect(accountLink?.getAttribute('href')).toBe('/account')
  })

  it('falls back to Sign In when getAuthToken throws', async () => {
    mockGetAuthToken.mockRejectedValue(new Error('cookie read failed'))
    await act(async () => {
      render(<SiteHeader />)
    })

    const signInLinks = screen.getAllByText('Sign In')
    expect(signInLinks.length).toBeGreaterThan(0)
  })
})
