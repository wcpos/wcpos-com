import { afterEach, describe, it, expect, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../../../messages/en.json'
import { DiscordWidget } from './discord-widget'

function widgetWithMessages() {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <DiscordWidget />
    </NextIntlClientProvider>
  )
}

describe('DiscordWidget', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders the WidgetBot channel as a plain iframe', () => {
    const { container } = render(widgetWithMessages())
    const iframe = screen.getByTitle('Discord chat')

    expect(iframe).toBeInstanceOf(HTMLIFrameElement)
    expect(iframe.getAttribute('src')).toBe(
      'https://emerald.widgetbot.io/channels/711884517081612298/1093100746372829254/'
    )
    expect(iframe).toHaveAttribute('allow', 'clipboard-write; fullscreen')
    expect(iframe).toHaveAttribute('loading', 'lazy')
    expect(container.querySelectorAll('iframe')).toHaveLength(1)
  })

  it('renders without console errors or an update-depth loop', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rerender } = render(
      <React.StrictMode>{widgetWithMessages()}</React.StrictMode>
    )

    rerender(<React.StrictMode>{widgetWithMessages()}</React.StrictMode>)
    rerender(<React.StrictMode>{widgetWithMessages()}</React.StrictMode>)

    expect(spy).not.toHaveBeenCalled()
    expect(
      spy.mock.calls.flat().map(String).some((arg) => arg.includes('Maximum update depth'))
    ).toBe(false)
  })

  describe('skeleton', () => {
    const READY = { widgetbot: true, id: 'default', event: 'ready' }

    afterEach(() => vi.useRealTimers())

    function renderWidget() {
      vi.useFakeTimers()
      render(widgetWithMessages())
      return screen.getByTitle('Discord chat') as HTMLIFrameElement
    }

    function postFrom(iframe: HTMLIFrameElement, data: unknown, origin = 'https://emerald.widgetbot.io') {
      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', { origin, source: iframe.contentWindow, data })
        )
      })
    }

    function advance(ms: number) {
      act(() => {
        vi.advanceTimersByTime(ms)
      })
    }

    const skeleton = () => screen.queryByTestId('discord-widget-skeleton')

    it('stays until the ready message plus the paint grace', () => {
      const iframe = renderWidget()
      expect(iframe.contentWindow).not.toBeNull()

      postFrom(iframe, JSON.stringify(READY))
      advance(599)
      expect(skeleton()).toBeInTheDocument()
      advance(1)
      expect(skeleton()).not.toBeInTheDocument()
    })

    it('does not go on load alone until the fallback', () => {
      const iframe = renderWidget()

      act(() => {
        fireEvent.load(iframe)
      })
      advance(5999)
      expect(skeleton()).toBeInTheDocument()
      advance(1)
      expect(skeleton()).not.toBeInTheDocument()
    })

    it('ignores a wrong origin or a non-ready event', () => {
      const iframe = renderWidget()

      postFrom(iframe, JSON.stringify(READY), 'https://evil.example')
      postFrom(iframe, JSON.stringify({ ...READY, event: 'signOut' }))
      advance(1000)
      expect(skeleton()).toBeInTheDocument()
    })

    it('accepts the ready message as a plain object', () => {
      const iframe = renderWidget()

      postFrom(iframe, READY)
      advance(600)
      expect(skeleton()).not.toBeInTheDocument()
    })
  })
})
