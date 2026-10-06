import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactElement } from 'react'
import { DiscordSection } from './discord-section'
import messages from '../../../messages/en.json'

vi.mock('@/components/support/discord-widget', () => ({
  DiscordWidget: () => <div data-testid="discord-widget" />,
}))

function renderWithIntl(ui: ReactElement) {
  return render(<NextIntlClientProvider locale="en" messages={messages}>{ui}</NextIntlClientProvider>)
}

describe('DiscordSection', () => {
  let onIntersect: (entries: { isIntersecting: boolean }[]) => void
  let rootMargin: string | undefined
  const observe = vi.fn()
  const disconnect = vi.fn()
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: typeof onIntersect, options: IntersectionObserverInit) {
        onIntersect = callback
        rootMargin = options.rootMargin
      }
      observe = observe
      disconnect = disconnect
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('does not mount the widget before its box nears the viewport', () => {
    renderWithIntl(<DiscordSection />)
    expect(screen.queryByTestId('discord-widget')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
    const region = screen.getByRole('region', { name: 'Prefer to talk to a human?' })
    expect(region).toBeInTheDocument()
    expect(region).toHaveClass('h-[600px]')
    expect(observe).toHaveBeenCalledWith(region)
    expect(rootMargin).toBe('200px 0px')
  })

  it('mounts the widget when the box scrolls into view, without a click', async () => {
    renderWithIntl(<DiscordSection />)
    act(() => onIntersect([{ isIntersecting: true }]))
    expect(await screen.findByTestId('discord-widget')).toBeInTheDocument()
    expect(disconnect).toHaveBeenCalled()
  })

  it('mounts the widget straight away where IntersectionObserver is missing', async () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    renderWithIntl(<DiscordSection />)
    expect(await screen.findByTestId('discord-widget')).toBeInTheDocument()
  })
})
