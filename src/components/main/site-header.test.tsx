import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, act } from '@testing-library/react'

// Mock medusa-auth before importing the component
vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: vi.fn(),
}))

// customer-avatar is server-only (crypto/gravatar) — stub it for the menu.
vi.mock('@/lib/customer-avatar', () => ({
  getCustomerAvatarUrl: () => 'https://avatar.test/a.png',
  getCustomerInitials: () => 'AB',
}))

vi.mock('@/lib/analytics/client-events', () => ({
  trackClientEvent: vi.fn(),
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

import { getCustomer } from '@/lib/medusa-auth'
import { trackClientEvent } from '@/lib/analytics/client-events'
import { SiteHeader } from './site-header'

const mockGetCustomer = vi.mocked(getCustomer)
const mockTrackClientEvent = vi.mocked(trackClientEvent)

describe('SiteHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the WCPOS logo link', async () => {
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    const logos = screen.getAllByText('WCPOS')
    expect(logos.length).toBeGreaterThan(0)

    const logoLink = logos[0].closest('a')
    expect(logoLink?.getAttribute('href')).toBe('/')
  })

  it('renders desktop nav links', async () => {
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    expect(screen.getAllByText('Docs').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Roadmap').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pro').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Support').length).toBeGreaterThan(0)
  })

  it('links Docs to external URL', async () => {
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    const docsLinks = screen.getAllByText('Docs')
    const docsLink = docsLinks[0].closest('a')
    expect(docsLink?.getAttribute('href')).toBe('https://docs.wcpos.com')
  })

  it('links Roadmap to /roadmap', async () => {
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    const roadmapLinks = screen.getAllByText('Roadmap')
    const roadmapLink = roadmapLinks[0].closest('a')
    expect(roadmapLink?.getAttribute('href')).toBe('/roadmap')
  })

  it('links Support to /support', async () => {
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    const supportLinks = screen.getAllByText('Support')
    const supportLink = supportLinks[0].closest('a')
    expect(supportLink?.getAttribute('href')).toBe('/support')
  })

  it('tracks Pro link clicks', async () => {
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    const proLinks = screen.getAllByText('Pro')
    const proLink = proLinks[0].closest('a')
    expect(proLink).toBeTruthy()

    fireEvent.click(proLink!)

    expect(mockTrackClientEvent).toHaveBeenCalledWith('click_pro_cta', undefined)
  })

  it('shows Sign In when not authenticated', async () => {
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    const signInLinks = screen.getAllByText('Sign In')
    expect(signInLinks.length).toBeGreaterThan(0)
  })

  it('shows the account menu when authenticated', async () => {
    mockGetCustomer.mockResolvedValue({
      id: 'cust_1',
      email: 'user@example.com',
      has_account: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    })
    await act(async () => {
      render(<SiteHeader />)
    })

    // Authenticated state renders an avatar menu trigger, not a plain link.
    expect(
      screen.getAllByRole('button', { name: /account menu/i }).length
    ).toBeGreaterThan(0)
  })

  it('tracks Sign In button clicks', async () => {
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    const signInLinks = screen.getAllByText('Sign In')
    const signInLink = signInLinks[0].closest('a')
    expect(signInLink).toBeTruthy()

    fireEvent.click(signInLink!)

    expect(mockTrackClientEvent).toHaveBeenCalledWith('click_sign_in', undefined)
  })

  it('falls back to Sign In when getCustomer throws', async () => {
    mockGetCustomer.mockRejectedValue(new Error('cookie read failed'))
    await act(async () => {
      render(<SiteHeader />)
    })

    const signInLinks = screen.getAllByText('Sign In')
    expect(signInLinks.length).toBeGreaterThan(0)
  })
})
