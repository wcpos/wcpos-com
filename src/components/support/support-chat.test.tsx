import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useEffect, useImperativeHandle } from 'react'
import type { Ref } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactElement } from 'react'
import messages from '../../../messages/en.json'
import frMessages from '../../../messages/fr.json'
import { locales, type Locale } from '@/i18n/config'

const { resetTurnstile } = vi.hoisted(() => ({ resetTurnstile: vi.fn() }))
const { trackClientEvent } = vi.hoisted(() => ({ trackClientEvent: vi.fn() }))
// auto=false lets a test hold the token back to exercise the failure paths;
// the captured callbacks then drive the widget by hand.
const turnstileMock = vi.hoisted(() => ({
  auto: true,
  onSuccess: null as ((t: string) => void) | null,
  onError: null as (() => void) | null,
  onUnsupported: null as (() => void) | null,
  onBeforeInteractive: null as (() => void) | null,
  onAfterInteractive: null as (() => void) | null,
}))

// CJK and Hangul characters render about twice as wide as Latin ones.
const width = (text: string) =>
  [...text].reduce((sum, ch) => {
    const c = ch.codePointAt(0)!
    const wide =
      (c >= 0x1100 && c <= 0x11ff) ||
      (c >= 0x2e80 && c <= 0x9fff) ||
      (c >= 0xac00 && c <= 0xd7af) ||
      (c >= 0xff00 && c <= 0xffef)
    return sum + (wide ? 2 : 1)
  }, 0)

const readFormMessages = (locale: Locale) =>
  JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'messages', `${locale}.json`), 'utf8'))
    .support.chat.form

// Pin a widget for every test host: the hook resolves its site key from
// window.location (jsdom = localhost = no widget otherwise); host mapping
// itself is covered by turnstile-keys.test.ts.
vi.mock('@/lib/support/turnstile-keys', () => ({
  resolveTurnstileSiteKey: () => 'site-key',
}))

vi.mock('@/lib/analytics/client-events', () => ({ trackClientEvent }))

// SupportPageContent reads ?ref= to show the order-support heading.
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('ref=WCPOS-1234'),
}))

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({
    onSuccess,
    onError,
    onUnsupported,
    onBeforeInteractive,
    onAfterInteractive,
    ref,
  }: {
    onSuccess: (t: string) => void
    onError: () => void
    onUnsupported: () => void
    onBeforeInteractive: () => void
    onAfterInteractive: () => void
    ref?: Ref<{ reset: () => void }>
  }) => {
    turnstileMock.onSuccess = onSuccess
    turnstileMock.onError = onError
    turnstileMock.onUnsupported = onUnsupported
    turnstileMock.onBeforeInteractive = onBeforeInteractive
    turnstileMock.onAfterInteractive = onAfterInteractive
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

import { SupportChat, SupportPageContent } from './support-chat'

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
  turnstileMock.onBeforeInteractive = null
  turnstileMock.onAfterInteractive = null
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
    const example = screen.getByRole('button', { name: 'How many sites can I use my license on?' })

    expect(example.className).toContain('inline-flex')
    fireEvent.click(example)

    await waitFor(() => expect(screen.getByText(/Open Settings/)).toBeInTheDocument())
    expect(fetch).toHaveBeenCalledWith('/api/support/ask', expect.objectContaining({
      body: expect.stringContaining('How many sites can I use my license on?'),
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
    const example = screen.getByRole('button', { name: 'How many sites can I use my license on?' })
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

  it('shows a status line while the security check verifies, and drops it once verified', () => {
    turnstileMock.auto = false
    renderWithIntl(<SupportChat />)

    expect(screen.getByRole('status')).toHaveTextContent('Running a quick security check…')

    act(() => turnstileMock.onSuccess?.('t'))

    expect(screen.queryByText('Running a quick security check…')).not.toBeInTheDocument()
  })

  it('shows no verifying status line once the widget has issued a token', () => {
    renderWithIntl(<SupportChat />)

    expect(screen.queryByText('Running a quick security check…')).not.toBeInTheDocument()
  })

  it('asks the visitor to tick the box during an interactive challenge', () => {
    const { verifying, interactive } = messages.support.chat.form
    turnstileMock.auto = false
    renderWithIntl(<SupportChat />)
    expect(screen.getByRole('status')).toHaveTextContent(verifying)

    act(() => turnstileMock.onBeforeInteractive?.())
    expect(screen.getByRole('status')).toHaveTextContent(interactive)
    expect(screen.queryByText(verifying)).not.toBeInTheDocument()

    act(() => turnstileMock.onAfterInteractive?.())
    expect(screen.getByRole('status')).toHaveTextContent(verifying)

    act(() => turnstileMock.onSuccess?.('t'))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('renders the security check under the form, above the example chips and poweredBy line', () => {
    const { container } = renderWithIntl(<SupportChat />)
    const wrapper = screen.getByTestId('support-turnstile')
    const form = container.querySelector('form')!
    const firstChip = screen.getByRole('button', { name: messages.support.chat.examples.e1 })
    const poweredBy = screen.getByText(messages.support.chat.poweredBy)
    const follows = (a: Node, b: Node) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

    expect(wrapper).toContainElement(screen.getByTestId('turnstile'))
    expect(follows(form, wrapper)).toBe(true)
    expect(follows(wrapper, firstChip)).toBe(true)
    expect(follows(wrapper, poweredBy)).toBe(true)
  })

  it('keeps every locale interactive-challenge hint to one short line', () => {
    for (const locale of locales) {
      const interactive: string = readFormMessages(locale).interactive
      expect(interactive, locale).toBeTruthy()
      expect(width(interactive), `${locale}: ${interactive}`).toBeLessThanOrEqual(60)
    }
  })

  it('keeps every locale placeholder short enough for a phone', () => {
    for (const locale of locales) {
      const placeholder: string = readFormMessages(locale).placeholder
      // 30 keeps the placeholder inside the input on a 390 px phone.
      expect(width(placeholder), `${locale}: ${placeholder}`).toBeLessThanOrEqual(30)
    }
  })

  it('re-enables the form when the widget stays silent past the timeout', () => {
    vi.useFakeTimers()
    turnstileMock.auto = false
    renderWithIntl(<SupportChat />)

    const example = screen.getByRole('button', { name: 'How many sites can I use my license on?' })
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
      screen.getByRole('button', { name: 'How many sites can I use my license on?' })
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

describe('support headings', () => {
  const expectHeroScale = (heading: HTMLElement) => {
    expect(heading).toHaveClass('text-4xl', 'md:text-5xl', 'tracking-tight', 'text-balance')
    expect(heading).not.toHaveClass('text-3xl')
  }

  it('puts the chat hero h1 on the hero type scale with a text-lg subtitle', () => {
    renderWithIntl(<SupportChat />)
    expectHeroScale(screen.getByRole('heading', { level: 1, name: messages.support.chat.hero.title }))
    expect(screen.getByText(messages.support.chat.hero.subtitle)).toHaveClass('text-lg')
  })

  it('puts the order-support h1 on the hero type scale', () => {
    renderWithIntl(<SupportPageContent />)
    expectHeroScale(screen.getByRole('heading', { level: 1, name: messages.support.order.title }))
  })
})
