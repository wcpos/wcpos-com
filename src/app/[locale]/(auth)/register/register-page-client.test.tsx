import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../../../../../messages/en.json'
import { RegisterPageClient } from './register-page-client'

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

function renderRegister(locale = 'en') {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <RegisterPageClient />
    </NextIntlClientProvider>
  )
}

describe('RegisterPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams = new URLSearchParams()
  })

  it('passes the active locale to the registration API for email localization', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, customer: { id: 'cus_1' } }),
    })

    renderRegister('fr')

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'new@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/account'))
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/register',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'new@example.com',
          password: 'password123',
          firstName: '',
          lastName: '',
          locale: 'fr',
        }),
      })
    )
  })
})
