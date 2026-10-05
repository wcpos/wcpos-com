import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useEffect, useImperativeHandle } from 'react'
import type { Ref } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactElement } from 'react'
import messages from '../../../messages/en.json'
import frMessages from '../../../messages/fr.json'
import type { Locale } from '@/i18n/config'

const { resetTurnstile } = vi.hoisted(() => ({ resetTurnstile: vi.fn() }))
const { trackClientEvent } = vi.hoisted(() => ({ trackClientEvent: vi.fn() }))
// auto=false lets a test hold the token back to exercise the failure paths;
// the captured callbacks then drive the widget by hand.
const turnstileMock = vi.hoisted(() => ({
  auto: true,
  onSuccess: null as ((t: string) => void) | null,
  onError: null as (() => void) | null,
  onUnsupported: null as (() => void) | null,
}))

// Pin a widget for every test host: the hook resolves its site key from
// window.location (jsdom = localhost = no widget otherwise); host mapping
// itself is covered by turnstile-keys.test.ts.
vi.mock('@/lib/support/turnstile-keys', () => ({
  resolveTurnstileSiteKey: () => 'site-key',
}))

vi.mock('@/lib/analytics/client-events', () => ({ trackClientEvent }))

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({
    onSuccess,
    onError,
    onUnsupported,
    ref,
  }: {
    onSuccess: (t: string) => void
    onError: () => void
    onUnsupported: () => void
    ref?: Ref<{ reset: () => void }>
  }) => {
    turnstileMock.onSuccess = onSuccess
    turnstileMock.onError = onError
    turnstileMock.onUnsupported = onUnsupported
    useEffect(() => {
      if (turnstileMock.auto) onSuccess('test-token-1')
    }, [onSuccess])
    useImperativeHandle(ref, () => ({
      reset: () => {
        resetTurnstile()
        onSuccess('test-token-2')
      },
    }))
    return <div data-testid="turnstile" />
  },
}))

import { SupportChat } from './support-chat'

const SESSION_ID = '5f1e2d3c-4b5a-4968-8776-655443322110'
const ANSWER_ID = '0b9c2f4e-3d1a-4c5b-9e8f-7a6b5c4d3e2f'

function renderWithIntl(
  ui: ReactElement,
  locale: Locale = 'en',
  providerMessages = messages
) {
  return render(
    <NextIntlClientProvider locale={locale} messages={providerMessages}>
      {ui}
    </NextIntlClientProvider>
  )
}

beforeEach(() => {
  resetTurnstile.mockClear()
  trackClientEvent.mockClear()
  turnstileMock.auto = true
  turnstileMock.onSuccess = null
  turnstileMock.onError = null
  turnstileMock.onUnsupported = null
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            answer: 'Open Settings → Printing.',
            sessionId: SESSION_ID,
            answerId: ANSWER_ID,
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ answer: 'Check Hardware → Printers.', sessionId: 's1' }), {
          status: 200,
        })
      )
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('SupportChat', () => {
  it('shows the busy message for a gateway_busy 429', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ errorCode: 'gateway_busy' }), { status: 429 })
    ))
    renderWithIntl(<SupportChat />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'How?' } })
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)
    expect(await screen.findByText(messages.support.errors.gateway_busy)).toBeInTheDocument()
  })

  it('shows the timeout message for a non-JSON 504 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(
      new Response('<html>Gateway Timeout</html>', { status: 504 })
    ))
    renderWithIntl(<SupportChat />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'How?' } })
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)
    expect(await screen.findByText(messages.support.errors.timeout)).toBeInTheDocument()
  })

  it.each(['<html>Unavailable</html>', '{"errorCode":"unexpected"}'])(
    'shows unavailable for an unrecognized error body: %s', async (body) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(body, { status: 503 })))
      renderWithIntl(<SupportChat />)
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'How?' } })
      fireEvent.submit(screen.getByRole('textbox').closest('form')!)
      expect(await screen.findByText(messages.support.errors.unavailable)).toBeInTheDocument()
    }
  )

  it.each([
    [
      '503 unavailable',
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ errorCode: 'unavailable' }), { status: 503 })
      ),
      messages.support.errors.unavailable,
    ],
    [
      'malformed 200',
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ answer: '' }), { status: 200 })
      ),
      messages.support.errors.empty_answer,
    ],
    [
      'network failure',
      vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')),
      messages.support.errors.network,
    ],
  ])('resets the widget after a failed attempt: %s', async (_, fetchMock, errorText) => {
    vi.stubGlobal('fetch', fetchMock)
    renderWithIntl(<SupportChat />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'How?' } })
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)
    expect(await screen.findByText(errorText)).toBeInTheDocument()
    expect(resetTurnstile).toHaveBeenCalledTimes(1)
  })

  it('suppresses assistant images and opens links in a new tab', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({
        answer: 'See ![x](https://evil.example/p.png) [docs](https://docs.wcpos.com/)',
      }), { status: 200 })
    ))
    const { container } = renderWithIntl(<SupportChat />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'How?' } })
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)
    expect(await screen.findByRole('link', { name: 'docs' })).toHaveAttribute('target', '_blank')
    expect(container.querySelector('img')).toBeNull()
  })

  it.each([null, {}, { answer: 1 }, { answer: '' }, { answer: '   ' }])(
    'shows empty_answer without appending a malformed success: %j', async (body) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify(body), { status: 200 })
      ))
      renderWithIntl(<SupportChat />)
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'How?' } })
      fireEvent.submit(screen.getByRole('textbox').closest('form')!)
      expect(await screen.findByText(messages.support.errors.empty_answer)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Yes' })).not.toBeInTheDocument()
    }
  )

  it.each([42, {}, ''])('does not store an invalid returned sessionId: %j', async (sessionId) => {
    sessionStorage.setItem('wcpos-support-session', SESSION_ID)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ answer: 'Do X.', sessionId }), { status: 200 })
    ))
    renderWithIntl(<SupportChat />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'How?' } })
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)
    expect(await screen.findByText('Do X.')).toBeInTheDocument()
    expect(sessionStorage.getItem('wcpos-support-session')).toBe(SESSION_ID)
  })

  it('submits a question and renders the answer', async () => {
    renderWithIntl(<SupportChat />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'How do I print?' } })
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)
    await waitFor(() => expect(screen.getByText(/Open Settings/)).toBeInTheDocument())
    expect(screen.getByText('How do I print?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Yes' }).className).toContain(
      'inline-flex',
    )

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'How do I add another?' } })
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)
    await waitFor(() => expect(screen.getByText(/Check Hardware/)).toBeInTheDocument())
    expect(screen.getByText('How do I add another?')).toBeInTheDocument()
    expect(resetTurnstile).toHaveBeenCalled()
  })

  it('votes once per answer, locks both buttons and keeps the PostHog event', async () => {
    renderWithIntl(<SupportChat />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'How do I print?' } })
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)
    await waitFor(() => expect(screen.getByText(/Open Settings/)).toBeInTheDocument())

    const no = screen.getByRole('button', { name: 'No' })
    const yes = screen.getByRole('button', { name: 'Yes' })
    fireEvent.click(no)
    fireEvent.click(no)
    fireEvent.click(yes)

    expect(no).toBeDisabled()
    expect(yes).toBeDisabled()
    expect(no).toHaveAttribute('aria-pressed', 'true')
    expect(yes).toHaveAttribute('aria-pressed', 'false')

    const feedbackCalls = vi
      .mocked(fetch)
      .mock.calls.filter(([url]) => url === '/api/support/feedback')
    expect(feedbackCalls).toHaveLength(1)
    expect(JSON.parse(String(feedbackCalls[0][1]?.body))).toEqual({
      answerId: ANSWER_ID,
      sessionId: SESSION_ID,
      vote: 'down',
      locale: 'en',
    })
    expect(trackClientEvent).toHaveBeenCalledTimes(1)
    expect(trackClientEvent).toHaveBeenCalledWith('support_answer_feedback', {
      helpful: false,
      turn: 1,
    })
  })

  it('shows no vote buttons on an answer without an answerId', async () => {
    renderWithIntl(<SupportChat />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'How do I print?' } })
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)
    await waitFor(() => expect(screen.getByText(/Open Settings/)).toBeInTheDocument())
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'And another?' } })
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)
    await waitFor(() => expect(screen.getByText(/Check Hardware/)).toBeInTheDocument())

    // Only the first answer carries an id, so only one pair of buttons.
    expect(screen.getAllByRole('button', { name: 'Yes' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'No' })).toHaveLength(1)
  })

  it('sends the active locale with support questions', async () => {
    renderWithIntl(<SupportChat />, 'fr')

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Comment imprimer ?' } })
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)

    await waitFor(() => expect(screen.getByText(/Open Settings/)).toBeInTheDocument())

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(String(init?.body))).toMatchObject({
      question: 'Comment imprimer ?',
      locale: 'fr',
    })
  })

  it('submits the translated example prompt when an example is clicked', async () => {
    renderWithIntl(<SupportChat />)
    const example = screen.getByRole('button', { name: 'How many sites can I use my licence on?' })

    expect(example.className).toContain('inline-flex')
    fireEvent.click(example)

    await waitFor(() => expect(screen.getByText(/Open Settings/)).toBeInTheDocument())
    expect(fetch).toHaveBeenCalledWith('/api/support/ask', expect.objectContaining({
      body: expect.stringContaining('How many sites can I use my licence on?'),
    }))
    expect(fetch).not.toHaveBeenCalledWith('/api/support/ask', expect.objectContaining({
      body: expect.stringContaining('"e1"'),
    }))
  })

  it('sends the localized example text rather than the internal example key', async () => {
    renderWithIntl(<SupportChat />, 'fr', frMessages)

    fireEvent.click(screen.getByRole('button', { name: 'Sur combien de sites puis-je utiliser ma licence ?' }))

    await waitFor(() => expect(screen.getByText(/Open Settings/)).toBeInTheDocument())

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(String(init?.body))).toMatchObject({
      question: 'Sur combien de sites puis-je utiliser ma licence ?',
      locale: 'fr',
    })
  })

  it('re-enables the form with a hint when the widget errors, and still submits', async () => {
    turnstileMock.auto = false
    renderWithIntl(<SupportChat />)

    // While the widget is verifying, the example chips are the visible gate.
    const example = screen.getByRole('button', { name: 'How many sites can I use my licence on?' })
    expect(example).toBeDisabled()

    // An ad-blocker eating challenges.cloudflare.com surfaces as onError (or
    // as pure silence — covered by the timeout test below).
    act(() => turnstileMock.onError?.())

    expect(screen.getByText(/security check couldn’t finish/)).toBeInTheDocument()
    expect(example).toBeEnabled()
    expect(trackClientEvent).toHaveBeenCalledWith('turnstile_gate_failed', {
      reason: 'widget_error',
    })

    // Submission goes through with an empty token — the server's fail-closed
    // check is the arbiter now, not a forever-disabled button.
    fireEvent.click(example)
    await waitFor(() => expect(screen.getByText(/Open Settings/)).toBeInTheDocument())
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(String(init?.body))).toMatchObject({ turnstileToken: '' })
  })

  it('re-enables the form when the widget stays silent past the timeout', () => {
    vi.useFakeTimers()
    turnstileMock.auto = false
    renderWithIntl(<SupportChat />)

    const example = screen.getByRole('button', { name: 'How many sites can I use my licence on?' })
    expect(example).toBeDisabled()

    act(() => {
      vi.advanceTimersByTime(15_000)
    })

    expect(screen.getByText(/security check couldn’t finish/)).toBeInTheDocument()
    expect(example).toBeEnabled()
    expect(trackClientEvent).toHaveBeenCalledWith('turnstile_gate_failed', {
      reason: 'timeout',
    })
  })

  it('re-enables the form when the browser is unsupported', () => {
    turnstileMock.auto = false
    renderWithIntl(<SupportChat />)

    act(() => turnstileMock.onUnsupported?.())

    expect(screen.getByText(/security check couldn’t finish/)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'How many sites can I use my licence on?' })
    ).toBeEnabled()
  })

  it('resets the widget and shows the error when the server rejects the bot check', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ errorCode: 'bot_check_failed' }), { status: 403 })
      )
    )
    renderWithIntl(<SupportChat />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'How do I print?' } })
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)

    await waitFor(() =>
      expect(screen.getByText(/Bot check failed/)).toBeInTheDocument()
    )
    expect(resetTurnstile).toHaveBeenCalled()
  })
})
