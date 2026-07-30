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
        new Response(JSON.stringify({ answer: 'Open Settings → Printing.', sessionId: 's1' }), {
          status: 200,
        })
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
    expect(trackClientEvent).toHaveBeenCalledWith('support_turnstile_error')

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
    expect(trackClientEvent).toHaveBeenCalledWith('support_turnstile_error')
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
