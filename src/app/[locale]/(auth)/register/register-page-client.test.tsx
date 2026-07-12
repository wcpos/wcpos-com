import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useImperativeHandle } from 'react'
import type { Ref } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../../../../../messages/en.json'
import { RegisterPageClient } from './register-page-client'

// Registration deliberately performs a full document navigation (not
// router.push) so the browser drops every client-side RSC cache rendered
// signed-out.
const mockAssign = vi.fn()
const mockFetch = vi.fn()
const mockGetPostHogSessionId = vi.hoisted(() => vi.fn())
const turnstileMock = vi.hoisted(() => ({
  onSuccess: null as ((token: string) => void) | null,
  onError: null as (() => void) | null,
  onExpire: null as (() => void) | null,
  reset: vi.fn(),
}))
let mockSearchParams = new URLSearchParams()

vi.stubGlobal('fetch', mockFetch)
vi.stubGlobal('location', { assign: mockAssign } as unknown as Location)

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}))

vi.mock('@/lib/analytics/posthog-browser', () => ({
  getPostHogSessionId: () => mockGetPostHogSessionId(),
}))

vi.mock('@/lib/support/turnstile-keys', () => ({
  resolveTurnstileSiteKey: () => 'site-key',
}))

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({
    onSuccess,
    onError,
    onExpire,
    ref,
  }: {
    onSuccess: (token: string) => void
    onError: () => void
    onExpire: () => void
    ref?: Ref<{ reset: () => void }>
  }) => {
    turnstileMock.onSuccess = onSuccess
    turnstileMock.onError = onError
    turnstileMock.onExpire = onExpire
    useImperativeHandle(ref, () => ({ reset: turnstileMock.reset }))
    return <div data-testid="turnstile" />
  },
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

function renderRegister(locale = 'en') {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <RegisterPageClient />
    </NextIntlClientProvider>
  )
}

function fillCredentials(email = 'new@example.com') {
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: email },
  })
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'password123' },
  })
}

function completeChallenge(token = 'valid-token') {
  expect(turnstileMock.onSuccess).not.toBeNull()
  act(() => turnstileMock.onSuccess?.(token))
}

describe('RegisterPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    turnstileMock.onSuccess = null
    turnstileMock.onError = null
    turnstileMock.onExpire = null
    mockGetPostHogSessionId.mockReturnValue(undefined)
    mockSearchParams = new URLSearchParams()
  })

  it('passes the active locale to the registration API for email localization', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, customer: { id: 'cus_1' } }),
    })

    renderRegister('fr')

    fillCredentials()
    const submit = screen.getByRole('button', { name: 'Create account' })
    expect(submit).toBeDisabled()
    completeChallenge()
    expect(submit).toBeEnabled()
    fireEvent.click(submit)

    // Locale-prefixed full navigation: the fr surface keeps the customer on fr.
    await waitFor(() => expect(mockAssign).toHaveBeenCalledWith('/fr/account'))
    expect(mockGetPostHogSessionId).toHaveBeenCalledTimes(1)
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
          turnstileToken: 'valid-token',
        }),
      })
    )
  })

  it('keeps registration in the current PostHog session when available', async () => {
    mockGetPostHogSessionId.mockReturnValue(
      '01890f3e-8b3a-7cc2-98c4-dc0c0c0c0c0c'
    )
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, customer: { id: 'cus_1' } }),
    })

    renderRegister('fr')

    fillCredentials()
    completeChallenge()
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(mockAssign).toHaveBeenCalledWith('/fr/account'))
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/register',
      expect.objectContaining({
        body: JSON.stringify({
          email: 'new@example.com',
          password: 'password123',
          firstName: '',
          lastName: '',
          locale: 'fr',
          sessionId: '01890f3e-8b3a-7cc2-98c4-dc0c0c0c0c0c',
          turnstileToken: 'valid-token',
        }),
      })
    )
  })

  it('resets the challenge after a non-OK registration response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ errorCode: 'rate_limit_unavailable' }),
    })

    renderRegister()
    fillCredentials()
    completeChallenge('rejected-token')
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(turnstileMock.reset).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Registration is temporarily unavailable. Please try again.'
    )
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled()
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/register',
      expect.objectContaining({
        body: expect.stringContaining('"turnstileToken":"rejected-token"'),
      })
    )
  })

  it('resets the challenge when a non-OK response has no JSON body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: vi
        .fn()
        .mockRejectedValue(new SyntaxError('Unexpected end of JSON input')),
    })

    renderRegister()
    fillCredentials()
    completeChallenge('rejected-token')
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(turnstileMock.reset).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('alert')).toHaveTextContent('Registration failed')
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled()
  })

  it('requires a fresh token after the challenge errors or expires', () => {
    renderRegister()
    fillCredentials()
    const submit = screen.getByRole('button', { name: 'Create account' })

    completeChallenge('first-token')
    expect(submit).toBeEnabled()

    act(() => turnstileMock.onError?.())
    expect(submit).toBeDisabled()

    completeChallenge('second-token')
    expect(submit).toBeEnabled()

    act(() => turnstileMock.onExpire?.())
    expect(submit).toBeDisabled()
  })
})
