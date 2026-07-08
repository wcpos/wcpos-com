import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useEffect, useImperativeHandle } from 'react'
import type { Ref } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactElement } from 'react'
import messages from '../../../messages/en.json'

const { resetTurnstile } = vi.hoisted(() => ({ resetTurnstile: vi.fn() }))

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({
    onSuccess,
    ref,
  }: {
    onSuccess: (t: string) => void
    ref?: Ref<{ reset: () => void }>
  }) => {
    useEffect(() => {
      onSuccess('test-token-1')
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

function renderWithIntl(ui: ReactElement, locale = 'en') {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

beforeEach(() => {
  resetTurnstile.mockClear()
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'site-key'
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
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  vi.unstubAllGlobals()
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

  it('renders example questions with the shared button styling', () => {
    renderWithIntl(<SupportChat />)
    expect(
      screen.getByRole('button', { name: 'Why is my licence inactive?' }).className,
    ).toContain('inline-flex')
  })
})
