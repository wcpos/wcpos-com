import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, act, within } from '@testing-library/react'

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
      getPro: 'Get Pro',
      support: 'Support',
      },
      common: {
        signIn: 'Translated sign in',
        menu: 'Translated menu',
        close: 'Translated close',
        account: 'Translated account',
        accountMenu: 'Translated account menu',
        signOut: 'Translated sign out',
      },
      'account.nav': {
        licenses: 'Translated licenses',
        proDownloads: 'Translated pro downloads',
        orders: 'Translated orders',
        profile: 'Translated profile',
      },
      footer: { language: 'Translated language', theme: 'Translated theme' },
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
  useRouter: () => ({ replace: vi.fn() }),
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
      screen.getByRole('button', { name: 'Translated menu' })
    )

    const proLinks = screen.getAllByText('Pro')
    const proLink = proLinks[1].closest('a')
    expect(proLink).toBeTruthy()

    fireEvent.click(proLink!)

    expect(mockTrackClientEvent).toHaveBeenCalledWith('click_pro_cta', {
      location: 'mobile_menu',
    })
  })

  it('switches desktop nav, auth buttons and the menu button at lg together', async () => {
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    // German labels need more than md's 768px next to Get Pro / Sign In.
    const desktopNav = screen.getAllByRole('navigation')[0]
    expect(desktopNav).toHaveClass('hidden', 'lg:flex')
    expect(desktopNav).not.toHaveClass('md:flex')
    const auth = screen.getAllByRole('link', { name: 'Translated sign in' })[0]
      .parentElement!
    expect(auth).toHaveClass('hidden', 'lg:flex')
    expect(auth).not.toHaveClass('md:flex')
    const trigger = screen.getByRole('button', { name: 'Translated menu' })
    expect(trigger).toHaveClass('lg:hidden')
    expect(trigger).not.toHaveClass('md:hidden')
  })

  it('uses a translated accessible label for the mobile menu trigger', async () => {
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    expect(
      screen.getByRole('button', { name: 'Translated menu' })
    ).toBeInTheDocument()
  })

  it('uses a translated accessible label for the mobile menu close button', async () => {
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Translated menu' })
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

  it('shows Get Pro and Sign In links when not authenticated', async () => {
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    expect(screen.getByRole('link', { name: 'Get Pro' })).toHaveAttribute(
      'href',
      '/pro'
    )
    expect(
      screen.getByRole('link', { name: 'Translated sign in' })
    ).toHaveAttribute('href', '/login')
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
    expect(screen.queryByRole('link', { name: 'Get Pro' })).toBeNull()
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
      screen.getByRole('button', { name: 'Translated menu' })
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

  it('keeps the pointer-hover spotlight when another link loses focus', async () => {
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    const supportLink = screen.getAllByText('Support')[0].closest('a')!
    const downloadsLink = screen.getAllByText('Downloads')[0].closest('a')!
    const spot = supportLink
      .closest('nav')!
      .querySelector('span[aria-hidden="true"]')!

    fireEvent.pointerEnter(supportLink)
    expect(spot.className).toContain('bg-muted')

    // A different link gaining and losing keyboard focus must not clear the
    // pointer-hover state while the pointer is still inside the nav.
    fireEvent.focus(downloadsLink)
    fireEvent.blur(downloadsLink)
    expect(spot.className).toContain('bg-muted')
  })

  it('falls back to the translated sign-in label when getCustomer throws', async () => {
    mockGetCustomer.mockRejectedValue(new Error('cookie read failed'))
    await act(async () => {
      render(<SiteHeader />)
    })

    const signInLinks = screen.getAllByText('Translated sign in')
    expect(signInLinks.length).toBeGreaterThan(0)
  })

  it('does not paint the highlighted Pro link red when it is not the current page', async () => {
    navState.pathname = '/support'
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Translated menu' })
    )

    const proLinks = screen.getAllByText('Pro').map((el) => el.closest('a'))
    expect(proLinks.length).toBeGreaterThanOrEqual(2)
    for (const link of proLinks) {
      expect(link).toBeTruthy()
      expect(link!.classList.contains('text-primary')).toBe(false)
      expect(link!.classList.contains('text-wcpos-red-accent')).toBe(false)
      expect(link!.hasAttribute('aria-current')).toBe(false)
    }
  })

  it('still marks Pro red when it is the current page', async () => {
    navState.pathname = '/pro'
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    const proLink = screen.getAllByText('Pro')[0].closest('a')
    expect(proLink?.classList.contains('text-wcpos-red-accent')).toBe(true)
  })

  it('labels the phone menu button in words and closes the panel from its own bar', async () => {
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    const trigger = screen.getByRole('button', { name: 'Translated menu' })
    expect(trigger).toHaveTextContent('Translated menu')
    fireEvent.click(trigger)

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: 'Translated close' }))
    expect(dialog).not.toBeInTheDocument()
  })

  it('closes the phone menu when a row opens a page', async () => {
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Translated menu' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('link', { name: 'Support' }))

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('draws the phone menu Sign In as ghost text beside the one filled Get Pro', async () => {
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Translated menu' }))
    })
    const dialog = await screen.findByRole('dialog')
    const signIn = await within(dialog).findByRole('link', {
      name: 'Translated sign in',
    })
    const getPro = within(dialog).getByRole('link', { name: 'Get Pro' })

    expect(signIn).toHaveAttribute('href', '/login')
    expect(signIn.className).not.toContain('border')
    expect(signIn.className).not.toContain('bg-wcpos-red')
    expect(getPro).toHaveAttribute('href', '/pro')
    expect(getPro).toHaveClass('bg-wcpos-red')
  })

  it('lists the account links and Sign out in the signed-in phone menu', async () => {
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

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Translated menu' }))
    })
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByRole('link', { name: 'Translated account' })

    for (const [name, href] of [
      ['Translated account', '/account'],
      ['Translated licenses', '/account/licenses'],
      ['Translated pro downloads', '/account/downloads'],
      ['Translated orders', '/account/orders'],
      ['Translated profile', '/account/profile'],
    ]) {
      expect(within(dialog).getByRole('link', { name })).toHaveAttribute(
        'href',
        href
      )
    }
    const signOut = within(dialog).getByRole('button', {
      name: 'Translated sign out',
    })
    expect(signOut.closest('form')).toHaveAttribute(
      'action',
      '/api/auth/logout?to=%2Flogin'
    )
    expect(within(dialog).queryByRole('link', { name: 'Get Pro' })).toBeNull()
  })

  it('marks the Documentation link as leaving the site', async () => {
    mockGetCustomer.mockResolvedValue(null)
    await act(async () => {
      render(<SiteHeader />)
    })

    const docsLink = screen.getAllByText('Documentation')[0].closest('a')!
    expect(docsLink.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
  })
})
