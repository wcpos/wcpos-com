import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../../../../../messages/en.json'
import { LoginPageClient } from './login-page-client'

const mockPush = vi.fn()
const mockFetch = vi.fn()
let mockSearchParams = new URLSearchParams()

vi.stubGlobal('fetch', mockFetch)

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
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/lib/analytics/client-events', () => ({
  trackClientEvent: vi.fn(),
}))

function renderLogin() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
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
    expect(mockPush).not.toHaveBeenCalled()
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

  it('does not render raw unknown OAuth error query values', () => {
    mockSearchParams = new URLSearchParams({ error: 'Invalid state parameter' })

    renderLogin()

    expect(screen.getByText(messages.auth.login.oauthFailed)).toBeInTheDocument()
    expect(screen.queryByText('Invalid state parameter')).not.toBeInTheDocument()
  })
})
