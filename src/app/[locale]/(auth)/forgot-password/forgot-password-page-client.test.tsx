import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../../../../../messages/en.json'
import { ForgotPasswordPageClient } from './forgot-password-page-client'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

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

function renderPage() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ForgotPasswordPageClient />
    </NextIntlClientProvider>
  )
}

describe('ForgotPasswordPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the sent view without saying whether the account exists, and can go back', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    renderPage()
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'maria@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(
      await screen.findByRole('heading', { name: 'Check your email' })
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'If an account exists for maria@example.com, a reset link is on its way.'
    )
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login'
    )

    fireEvent.click(screen.getByRole('button', { name: 'Use a different email' }))
    expect(screen.getByLabelText('Email')).toHaveValue('maria@example.com')
  })

  it('points provider sign-ups back to sign in from the form', () => {
    renderPage()

    expect(screen.getByRole('link', { name: 'Return to sign in' })).toHaveAttribute(
      'href',
      '/login'
    )
  })
})
