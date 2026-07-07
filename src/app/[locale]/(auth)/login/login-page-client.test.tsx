import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../../../../../messages/en.json'
import { LoginPageClient } from './login-page-client'

const mockPush = vi.fn()
const mockFetch = vi.fn()

vi.stubGlobal('fetch', mockFetch)

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
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
})
