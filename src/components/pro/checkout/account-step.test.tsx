import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  onBeforeInteractive: null as (() => void) | null,
  onTimeout: null as (() => void) | null,
  reset: vi.fn(),
}))

vi.mock('@/lib/analytics/posthog-browser', () => ({
  getPostHogSessionId: () => getPostHogSessionIdMock(),
}))

const trackClientEventMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/analytics/client-events', () => ({
  trackClientEvent: trackClientEventMock,
}))

vi.mock('@/lib/support/turnstile-keys', () => ({
  resolveTurnstileSiteKey: () => 'site-key',
}))

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({
    onSuccess,
    onError,
    onExpire,
    onBeforeInteractive,
    onTimeout,
    ref,
  }: {
    onSuccess: (token: string) => void
    onError: () => void
    onExpire: () => void
    onBeforeInteractive: () => void
    onTimeout: () => void
    ref?: Ref<{ reset: () => void }>
  }) => {
    turnstileMock.onSuccess = onSuccess
    turnstileMock.onError = onError
    turnstileMock.onExpire = onExpire
    turnstileMock.onBeforeInteractive = onBeforeInteractive
    turnstileMock.onTimeout = onTimeout
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
    turnstileMock.onBeforeInteractive = null
    turnstileMock.onTimeout = null
  })

  afterEach(() => {
    vi.useRealTimers()
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

  it('only activates and renders Turnstile while registering', async () => {
    vi.useFakeTimers()
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ errorCode: 'account_exists' }),
    })
    renderAccountStep()
    fillCredentials('existing@example.com')
    completeChallenge('valid-token')
    expect(screen.getByTestId('turnstile')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Create account & continue' })
      )
    })

    expect(
      screen.getByRole('button', { name: 'Sign in & continue' })
    ).toBeEnabled()
    expect(screen.queryByTestId('turnstile')).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(15_000))

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'different@example.com' },
    })
    expect(screen.getByTestId('turnstile')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Create account & continue' })
    ).toBeDisabled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
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

  it('clears a failed gate across sign-in before registration resumes', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ errorCode: 'account_exists' }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200 })
    const { onAuthenticated } = renderAccountStep()
    fillCredentials('existing@example.com')

    act(() => turnstileMock.onError?.())
    fireEvent.click(
      screen.getByRole('button', { name: 'Create account & continue' })
    )

    await screen.findByRole('button', { name: 'Sign in & continue' })
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'different@example.com' },
    })

    const registerAgain = screen.getByRole('button', {
      name: 'Create account & continue',
    })
    expect(registerAgain).toBeDisabled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    fireEvent.click(registerAgain)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    completeChallenge('fresh-token')
    fireEvent.click(registerAgain)

    await waitFor(() =>
      expect(onAuthenticated).toHaveBeenCalledWith('different@example.com')
    )
    const firstBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))
    expect(firstBody.turnstileToken).toBe('')
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

  it('unlocks submission with a hint when the widget errors, and re-locks on expiry', () => {
    renderAccountStep()
    fillCredentials()
    const submit = screen.getByRole('button', {
      name: 'Create account & continue',
    })

    completeChallenge('first-token')
    expect(submit).toBeEnabled()

    // Widget failure must never dead-end the customer: the button stays
    // usable and the server's fail-closed check becomes the arbiter.
    act(() => turnstileMock.onError?.())
    expect(submit).toBeEnabled()
    expect(screen.getByRole('status')).toHaveTextContent(
      'The browser security check couldn’t finish'
    )

    completeChallenge('second-token')
    expect(submit).toBeEnabled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    act(() => turnstileMock.onExpire?.())
    expect(submit).toBeDisabled()
  })

  it('unlocks submission when the widget never responds, and surfaces the server verdict', async () => {
    vi.useFakeTimers()
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ errorCode: 'bot_check_failed' }),
    })
    renderAccountStep()
    fillCredentials()
    const submit = screen.getByRole('button', {
      name: 'Create account & continue',
    })
    expect(submit).toBeDisabled()

    // A blocked challenges.cloudflare.com script fires no callback at all.
    act(() => vi.advanceTimersByTime(15_000))
    vi.useRealTimers()

    expect(screen.getByRole('status')).toHaveTextContent(
      'The browser security check couldn’t finish'
    )
    expect(trackClientEventMock).toHaveBeenCalledWith('turnstile_gate_failed', {
      reason: 'timeout',
    })
    expect(submit).toBeEnabled()
    fireEvent.click(submit)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Bot verification failed. Please try again.'
    )
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(body.turnstileToken).toBe('')
  })

  it('re-arms the silence fallback when an interactive challenge times out unsolved', () => {
    vi.useFakeTimers()
    renderAccountStep()
    fillCredentials()
    const submit = screen.getByRole('button', {
      name: 'Create account & continue',
    })

    // A visible interactive challenge suspends the silence deadline — the
    // visitor may legitimately take their time solving it.
    act(() => turnstileMock.onBeforeInteractive?.())
    act(() => vi.advanceTimersByTime(60_000))
    expect(submit).toBeDisabled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    // The challenge expires unsolved: the deadline re-arms, and continued
    // silence unlocks submission instead of dead-ending the visitor.
    act(() => turnstileMock.onTimeout?.())
    act(() => vi.advanceTimersByTime(15_000))
    expect(submit).toBeEnabled()
    expect(screen.getByRole('status')).toHaveTextContent(
      'The browser security check couldn’t finish'
    )
  })

  it('reports one analytics event per failure episode, plus the recovery', () => {
    renderAccountStep()
    fillCredentials()

    // Turnstile auto-retries fire onError repeatedly — one episode, one event.
    act(() => turnstileMock.onError?.())
    act(() => turnstileMock.onError?.())
    expect(trackClientEventMock).toHaveBeenCalledTimes(1)
    expect(trackClientEventMock).toHaveBeenCalledWith('turnstile_gate_failed', {
      reason: 'widget_error',
    })

    completeChallenge('late-token')
    expect(trackClientEventMock).toHaveBeenCalledWith(
      'turnstile_gate_recovered'
    )

    // A failure after a recovery is a new episode and reports again.
    act(() => turnstileMock.onError?.())
    expect(
      trackClientEventMock.mock.calls.filter(
        (call) => call[0] === 'turnstile_gate_failed'
      )
    ).toHaveLength(2)
  })
})
