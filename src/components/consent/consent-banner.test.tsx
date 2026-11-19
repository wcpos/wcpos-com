import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { ConsentBanner } from './consent-banner'

const { readAnalyticsConsent, writeAnalyticsConsent } = vi.hoisted(() => ({
  readAnalyticsConsent: vi.fn<() => 'granted' | 'denied' | null>(),
  writeAnalyticsConsent: vi.fn(),
}))

vi.mock('@/lib/analytics/consent', () => ({
  readAnalyticsConsent,
  writeAnalyticsConsent,
}))

vi.mock('@/lib/analytics/posthog-browser', () => ({
  initPostHogBrowser: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const messages: Record<string, string> = {
  label: 'Cookie consent',
  decline: 'Decline',
  accept: 'Accept',
}

vi.mock('next-intl', () => ({
  useTranslations: () =>
    Object.assign((key: string) => messages[key] ?? key, {
      rich: (_key: string, values: { privacyLink: (chunks: ReactNode) => ReactNode }) => (
        <>We use an anonymous analytics cookie. {values.privacyLink('Privacy policy')}</>
      ),
    }),
}))

describe('ConsentBanner', () => {
  beforeEach(() => {
    readAnalyticsConsent.mockReset().mockReturnValue(null)
    writeAnalyticsConsent.mockReset()
  })

  it('renders both buttons and the privacy link when no decision is stored', () => {
    render(<ConsentBanner />)

    expect(screen.getByTestId('consent-banner')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute(
      'href',
      '/privacy'
    )
  })

  it('renders nothing when a decision is stored', () => {
    readAnalyticsConsent.mockReturnValue('denied')
    const { container } = render(<ConsentBanner />)

    expect(container).toBeEmptyDOMElement()
  })

  it('writes granted on Accept and hides the banner', () => {
    render(<ConsentBanner />)
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }))

    expect(writeAnalyticsConsent).toHaveBeenCalledExactlyOnceWith('granted')
    expect(screen.queryByTestId('consent-banner')).not.toBeInTheDocument()
  })

  it('writes denied on Decline and hides the banner', () => {
    render(<ConsentBanner />)
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }))

    expect(writeAnalyticsConsent).toHaveBeenCalledExactlyOnceWith('denied')
    expect(screen.queryByTestId('consent-banner')).not.toBeInTheDocument()
  })

  it('keeps the phone and desktop sizes split', () => {
    render(<ConsentBanner />)
    const banner = screen.getByTestId('consent-banner')
    const message = screen.getByText(/anonymous analytics cookie/)

    expect(message.tagName).toBe('P')
    expect(message).toHaveClass('text-xs', 'sm:text-sm')
    expect(banner).toHaveClass('sm:p-4')
  })
})
