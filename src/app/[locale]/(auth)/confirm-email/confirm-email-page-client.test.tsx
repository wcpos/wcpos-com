import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../../../../../messages/en.json'
import { ConfirmEmailPageClient } from './confirm-email-page-client'

const mockFetch = vi.fn()
const mockSearchParams = new URLSearchParams({ token: 'signed-token' })

vi.stubGlobal('fetch', mockFetch)

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

function renderPage({ strict = false }: { strict?: boolean } = {}) {
  const page = (
    <NextIntlClientProvider locale="en" messages={messages}>
      <ConfirmEmailPageClient />
    </NextIntlClientProvider>
  )
  return render(strict ? <StrictMode>{page}</StrictMode> : page)
}

describe('ConfirmEmailPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('applies the single in-flight result after Strict Mode replays the effect', async () => {
    let resolveFetch!: (response: {
      ok: boolean
      json: () => Promise<{ email: string }>
    }) => void
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve
      })
    )

    renderPage({ strict: true })
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))

    resolveFetch({
      ok: true,
      json: async () => ({ email: 'new@example.com' }),
    })

    expect(
      await screen.findByRole('heading', { name: 'Email address updated' })
    ).toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('shows rate limiting as retryable instead of calling the link invalid', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ errorCode: 'rate_limited' }),
    })

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many attempts. Please try again later.'
    )
  })
})
