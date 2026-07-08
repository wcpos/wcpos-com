import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../../../../../messages/en.json'
import { ResetPasswordPageClient } from './reset-password-page-client'

// A reset that signs the customer in changed the session cookie, so it must
// leave via a full document navigation (navigateAfterAuthChange); the
// signed-out fallback is an ordinary soft navigation to /login.
const mockAssign = vi.fn()
const mockPush = vi.fn()
const mockFetch = vi.fn()
const mockSearchParams = new URLSearchParams({
  token: 'reset-token-1',
  email: 'user@example.com',
})

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
  useRouter: () => ({ push: mockPush }),
}))

function renderResetPassword(locale = 'en') {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ResetPasswordPageClient />
    </NextIntlClientProvider>
  )
}

async function submitNewPassword(locale?: string) {
  const view = renderResetPassword(locale)
  fireEvent.change(view.getByLabelText('New password'), {
    target: { value: 'brand-new-password-1' },
  })
  fireEvent.click(view.getByRole('button', { name: 'Reset password' }))
  return view
}

describe('ResetPasswordPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('signs in via a full document navigation to the locale-prefixed account page', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, signedIn: true }),
    })

    await submitNewPassword('fr')

    await waitFor(() => expect(mockAssign).toHaveBeenCalledWith('/fr/account'))
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('falls back to a soft navigation to /login when the reset does not sign in', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, signedIn: false }),
    })

    await submitNewPassword()

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login'))
    expect(mockAssign).not.toHaveBeenCalled()
  })
})
