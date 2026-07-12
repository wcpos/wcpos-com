import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../../../../../messages/en.json'
import { LoginPageClient } from './login-page-client'

// Sign-in deliberately performs a full document navigation (not router.push)
// so the browser drops every client-side RSC cache rendered signed-out.
const mockAssign = vi.fn()
const mockFetch = vi.fn()
let mockSearchParams = new URLSearchParams()

vi.stubGlobal('fetch', mockFetch)
vi.stubGlobal('location', { assign: mockAssign } as unknown as Location)

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
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
}))

vi.mock('@/lib/analytics/client-events', () => ({
  trackClientEvent: vi.fn(),
}))

function renderLogin(locale = 'en') {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LoginPageClient />
    </NextIntlClientProvider>
  )
}

describe('LoginPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams = new URLSearchParams()
  })

  it('localizes login API error codes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ errorCode: 'invalid_credentials' }),
    })

    renderLogin()

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrong-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument()
    expect(mockAssign).not.toHaveBeenCalled()
  })

  it('shows customer-safe support copy for a held email login', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ errorCode: 'account_security_hold' }),
    })

    renderLogin()

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'held@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correct-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(
      await screen.findByText(
        'We can’t sign you in right now. Please contact support for help with your account.'
      )
    ).toBeInTheDocument()
    expect(mockAssign).not.toHaveBeenCalled()
  })

  it('signs in with a full document navigation to the locale-prefixed redirect', async () => {
    mockSearchParams = new URLSearchParams({ redirect: '/pro/checkout' })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    renderLogin('fr')

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correct-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await vi.waitFor(() =>
      expect(mockAssign).toHaveBeenCalledWith('/fr/pro/checkout')
    )
  })

  it('localizes safe OAuth error codes from the callback URL', () => {
    mockSearchParams = new URLSearchParams({ error: 'oauth_email_missing' })

    renderLogin()

    expect(
      screen.getByText(
        'Your OAuth profile did not include an email address. Make sure your email is available with the provider, then try again.'
      )
    ).toBeInTheDocument()
  })

  it('shows the same support copy for a held OAuth login', () => {
    mockSearchParams = new URLSearchParams({ error: 'account_security_hold' })

    renderLogin()

    expect(
      screen.getByText(
        'We can’t sign you in right now. Please contact support for help with your account.'
      )
    ).toBeInTheDocument()
  })

  it('does not render raw unknown OAuth error query values', () => {
    mockSearchParams = new URLSearchParams({ error: 'Invalid state parameter' })

    renderLogin()

    expect(screen.getByText(messages.auth.login.oauthFailed)).toBeInTheDocument()
    expect(screen.queryByText('Invalid state parameter')).not.toBeInTheDocument()
  })

  it('passes the active locale to OAuth initiation links', () => {
    renderLogin('fr')

    expect(screen.getByRole('link', { name: /google/i })).toHaveAttribute(
      'href',
      '/api/auth/google?locale=fr&redirect=%2Faccount'
    )
  })
})
