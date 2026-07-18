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
  useLocale: () => 'en',
  useTranslations: (namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      header: {
      downloads: 'Downloads',
      documentation: 'Documentation',
      roadmap: 'Roadmap',
      pro: 'Pro',
      support: 'Support',
      },
      common: {
        signIn: 'Translated sign in',
        openMenu: 'Translated open menu',
        close: 'Translated close',
        account: 'Translated account',
        accountMenu: 'Translated account menu',
        signOut: 'Translated sign out',
      },
    }
    return translations[namespace]?.[key] ?? key
  },
}))

// Mock i18n navigation Link as a simple anchor; pathname is mutable per-test
// so active-page detection can be exercised.
const { navState } = vi.hoisted(() => ({
  navState: { pathname: '/' },
}))

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
  usePathname: () => navState.pathname,
}))

import { getCustomer } from '@/lib/medusa-auth'
import { trackClientEvent } from '@/lib/analytics/client-events'
import { SiteHeader } from './site-header'

const mockGetCustomer = vi.mocked(getCustomer)
const mockTrackClientEvent = vi.mocked(trackClientEvent)

describe('SiteHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    navState.pathname = '/'
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

    expect(screen.getAllByText('Downloads').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Documentation').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Roadmap').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pro').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Support').length).toBeGreaterThan(0)
  })

  it('links Documentation to external URL', async () => {
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    const docsLinks = screen.getAllByText('Documentation')
    const docsLink = docsLinks[0].closest('a')
    expect(docsLink?.getAttribute('href')).toBe('https://docs.wcpos.com')
  })

  it('links Downloads to /downloads', async () => {
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    const downloadsLink = screen.getAllByText('Downloads')[0].closest('a')
    expect(downloadsLink?.getAttribute('href')).toBe('/downloads')
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

  it('attributes desktop Pro link clicks to the desktop header', async () => {
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    const proLinks = screen.getAllByText('Pro')
    const proLink = proLinks[0].closest('a')
    expect(proLink).toBeTruthy()

    fireEvent.click(proLink!)

    expect(mockTrackClientEvent).toHaveBeenCalledWith('click_pro_cta', {
      location: 'desktop_header',
    })
  })

  it('attributes mobile Pro link clicks to the mobile menu', async () => {
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Translated open menu' })
    )

    const proLinks = screen.getAllByText('Pro')
    const proLink = proLinks[1].closest('a')
    expect(proLink).toBeTruthy()

    fireEvent.click(proLink!)

    expect(mockTrackClientEvent).toHaveBeenCalledWith('click_pro_cta', {
      location: 'mobile_menu',
    })
  })

  it('uses a translated accessible label for the mobile menu trigger', async () => {
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    expect(
      screen.getByRole('button', { name: 'Translated open menu' })
    ).toBeInTheDocument()
  })

  it('uses a translated accessible label for the mobile menu close button', async () => {
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Translated open menu' })
    )

    expect(
      await screen.findByRole('button', { name: 'Translated close' })
    ).toBeInTheDocument()
  })

  it('shows the translated sign-in label when not authenticated', async () => {
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    const signInLinks = screen.getAllByText('Translated sign in')
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
      screen.getAllByRole('button', { name: 'Translated account menu' }).length
    ).toBeGreaterThan(0)
  })

  it('tracks translated sign-in button clicks', async () => {
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    const signInLinks = screen.getAllByText('Translated sign in')
    const signInLink = signInLinks[0].closest('a')
    expect(signInLink).toBeTruthy()

    fireEvent.click(signInLink!)

    expect(mockTrackClientEvent).toHaveBeenCalledWith('click_sign_in', undefined)
  })

  it('marks the current page with aria-current in desktop and mobile navs', async () => {
    navState.pathname = '/downloads'
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    // Sheet content mounts on open — trigger it so the mobile nav renders too.
    fireEvent.click(
      screen.getByRole('button', { name: 'Translated open menu' })
    )

    const downloadsLinks = screen
      .getAllByText('Downloads')
      .map((el) => el.closest('a'))
    expect(downloadsLinks.length).toBe(2) // desktop + mobile sheet
    for (const link of downloadsLinks) {
      expect(link?.getAttribute('aria-current')).toBe('page')
    }

    const supportLink = screen.getAllByText('Support')[0].closest('a')
    expect(supportLink?.getAttribute('aria-current')).toBeNull()
  })

  it('treats sub-pages as active for their nav section', async () => {
    navState.pathname = '/pro/checkout'
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    const proLink = screen.getAllByText('Pro')[0].closest('a')
    expect(proLink?.getAttribute('aria-current')).toBe('page')
  })

  it('never marks the external Documentation link as active', async () => {
    navState.pathname = '/documentation'
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    const docsLink = screen.getAllByText('Documentation')[0].closest('a')
    expect(docsLink?.getAttribute('aria-current')).toBeNull()
  })

  it('falls back to the translated sign-in label when getCustomer throws', async () => {
    mockGetCustomer.mockRejectedValue(new Error('cookie read failed'))
    await act(async () => {
      render(<SiteHeader />)
    })

    const signInLinks = screen.getAllByText('Translated sign in')
    expect(signInLinks.length).toBeGreaterThan(0)
  })
})
