import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithIntl as render } from '@/test/intl'

const pathnameRef = vi.hoisted(() => ({ value: '/account/orders' }))

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    prefetch,
    ...props
  }: {
    children: React.ReactNode
    href: string
    prefetch?: boolean
    [key: string]: unknown
  }) => (
    <a href={href} data-prefetch={String(prefetch)} {...props}>
      {children}
    </a>
  ),
  usePathname: () => pathnameRef.value,
}))

import { ExpiryBannerClient } from './expiry-banner-client'

const EXPIRY = '2099-01-15T00:00:00.000Z'
const RENEW = '/pro/checkout?product=wcpos-pro-yearly'
const DISMISS_KEY = `wcpos:expiryBannerDismissed:${EXPIRY}`

beforeEach(() => {
  pathnameRef.value = '/account/orders'
  sessionStorage.clear()
})

describe('ExpiryBannerClient', () => {
  it('shows the expiry notice with a renew link off the licenses page', () => {
    render(<ExpiryBannerClient expiry={EXPIRY} renewHref={RENEW} />)

    expect(screen.getByText(/2099/)).toBeTruthy()
    const renew = screen.getByRole('link', { name: 'Renew' })
    expect(renew.getAttribute('href')).toBe(RENEW)
  })

  it('links to the roadmap as a reason to renew', () => {
    render(<ExpiryBannerClient expiry={EXPIRY} renewHref={RENEW} />)

    const roadmap = screen.getByRole('link', { name: /roadmap/i })
    expect(roadmap.getAttribute('href')).toBe('/roadmap')
  })

  it('is suppressed on the licenses page (which has its own notices)', () => {
    pathnameRef.value = '/account/licenses'
    render(<ExpiryBannerClient expiry={EXPIRY} renewHref={RENEW} />)

    expect(screen.queryByRole('link', { name: 'Renew' })).toBeNull()
  })

  it('dismisses for the visit and records the dismissal', () => {
    render(<ExpiryBannerClient expiry={EXPIRY} renewHref={RENEW} />)

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(screen.queryByRole('link', { name: 'Renew' })).toBeNull()
    expect(sessionStorage.getItem(DISMISS_KEY)).toBe('1')
  })

  it('stays hidden when already dismissed for this expiry', () => {
    sessionStorage.setItem(DISMISS_KEY, '1')
    render(<ExpiryBannerClient expiry={EXPIRY} renewHref={RENEW} />)

    expect(screen.queryByRole('link', { name: 'Renew' })).toBeNull()
  })

  it('re-shows when the dismissal marker is for a different (older) expiry', () => {
    sessionStorage.setItem(
      'wcpos:expiryBannerDismissed:2098-01-01T00:00:00.000Z',
      '1'
    )
    render(<ExpiryBannerClient expiry={EXPIRY} renewHref={RENEW} />)

    expect(screen.getByRole('link', { name: 'Renew' })).toBeTruthy()
  })
})
