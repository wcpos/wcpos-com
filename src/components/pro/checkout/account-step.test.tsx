import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useImperativeHandle } from 'react'
import type { ReactNode, Ref } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../../../../messages/en.json'

const fetchMock = vi.fn()
const getPostHogSessionIdMock = vi.hoisted(() => vi.fn())
const turnstileMock = vi.hoisted(() => ({
  onSuccess: null as ((token: string) => void) | null,
  onError: null as (() => void) | null,
  onExpire: null as (() => void) | null,
  reset: vi.fn(),
}))

vi.mock('@/lib/analytics/posthog-browser', () => ({
  getPostHogSessionId: () => getPostHogSessionIdMock(),
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
    children: ReactNode
    href: unknown
  }) => (
    <a href={typeof href === 'string' ? href : '#login'} {...props}>
      {children}
    </a>
  ),
}))

import { AccountStep } from './account-step'

function renderAccountStep(onAuthenticated = vi.fn()) {
  return {
    onAuthenticated,
    ...render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <AccountStep
          checkoutPath="/pro/checkout?billing=yearly"
          onAuthenticated={onAuthenticated}
        />
      </NextIntlClientProvider>
    ),
  }
}

function fillCredentials(email = 'new@example.com') {
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: email },
  })
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'password123' },
  })
}

function completeChallenge(token: string) {
  expect(turnstileMock.onSuccess).not.toBeNull()
  act(() => turnstileMock.onSuccess?.(token))
}

describe('AccountStep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    getPostHogSessionIdMock.mockReturnValue(undefined)
    turnstileMock.onSuccess = null
    turnstileMock.onError = null
    turnstileMock.onExpire = null
  })

  it('waits for Turnstile and sends its token when registering', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 })
    const { onAuthenticated } = renderAccountStep()
    fillCredentials()

    const submit = screen.getByRole('button', {
      name: 'Create account & continue',
    })
    expect(submit).toBeDisabled()

    completeChallenge('valid-token')
    expect(submit).toBeEnabled()
    fireEvent.click(submit)

    await waitFor(() =>
      expect(onAuthenticated).toHaveBeenCalledWith('new@example.com')
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/register',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'new@example.com',
          password: 'password123',
          locale: 'en',
          turnstileToken: 'valid-token',
        }),
      })
    )
  })

  it('resets after a 409 and requires a fresh challenge when an edited email returns to registration', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ errorCode: 'account_exists' }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200 })
    const { onAuthenticated } = renderAccountStep()
    fillCredentials('existing@example.com')
    completeChallenge('original-token')

    fireEvent.click(
      screen.getByRole('button', { name: 'Create account & continue' })
    )

    const signIn = await screen.findByRole('button', {
      name: 'Sign in & continue',
    })
    expect(turnstileMock.reset).toHaveBeenCalledTimes(1)
    expect(signIn).toBeEnabled()

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'different@example.com' },
    })
    const registerAgain = screen.getByRole('button', {
      name: 'Create account & continue',
    })
    expect(registerAgain).toBeDisabled()

    completeChallenge('fresh-token')
    expect(registerAgain).toBeEnabled()
    fireEvent.click(registerAgain)

    await waitFor(() =>
      expect(onAuthenticated).toHaveBeenCalledWith('different@example.com')
    )
    const firstBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))
    expect(firstBody.turnstileToken).toBe('original-token')
    expect(secondBody.turnstileToken).toBe('fresh-token')
  })

  it('resets the challenge after other non-OK registration responses', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ errorCode: 'rate_limit_unavailable' }),
    })
    renderAccountStep()
    fillCredentials()
    completeChallenge('rejected-token')

    fireEvent.click(
      screen.getByRole('button', { name: 'Create account & continue' })
    )

    await waitFor(() => expect(turnstileMock.reset).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Registration is temporarily unavailable. Please try again.'
    )
    expect(
      screen.getByRole('button', { name: 'Create account & continue' })
    ).toBeDisabled()
  })

  it('shows the localized retry message when inline registration is rate limited', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ errorCode: 'rate_limited' }),
    })
    renderAccountStep()
    fillCredentials()
    completeChallenge('rate-limited-token')

    fireEvent.click(
      screen.getByRole('button', { name: 'Create account & continue' })
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many attempts. Please try again later.'
    )
    expect(turnstileMock.reset).toHaveBeenCalledTimes(1)
  })

  it('shows customer-safe support copy when inline sign-in is held', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ errorCode: 'account_exists' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ errorCode: 'account_security_hold' }),
      })
    const { onAuthenticated } = renderAccountStep()
    fillCredentials('held@example.com')
    completeChallenge('valid-token')

    fireEvent.click(
      screen.getByRole('button', { name: 'Create account & continue' })
    )
    const signIn = await screen.findByRole('button', {
      name: 'Sign in & continue',
    })
    fireEvent.click(signIn)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We can’t sign you in right now. Please contact support for help with your account.'
    )
    expect(onAuthenticated).not.toHaveBeenCalled()
  })

  it('requires a fresh registration token after widget errors and expiry', () => {
    renderAccountStep()
    fillCredentials()
    const submit = screen.getByRole('button', {
      name: 'Create account & continue',
    })

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
