import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactElement } from 'react'
import { DiscordSection } from './discord-section'
import { clientMessages } from '@/i18n/client-messages'
import { DISCORD_INVITE_URL } from '@/lib/discord-invite'
import messages from '../../../messages/en.json'
import de from '../../../messages/de.json'
import nl from '../../../messages/nl.json'
import fr from '../../../messages/fr.json'
import es from '../../../messages/es.json'
import it_ from '../../../messages/it.json'
import pt from '../../../messages/pt.json'
import ja from '../../../messages/ja.json'
import ko from '../../../messages/ko.json'
import zh from '../../../messages/zh.json'

const LOCALES = { en: messages, de, nl, fr, es, it: it_, pt, ja, ko, zh }

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

  it('does not mount the widget before its box nears the viewport', async () => {
    renderWithIntl(<DiscordSection />)
    // DiscordWidget is next/dynamic: give its import time to resolve, so an eager mount would show.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
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

  it('links to the Discord invite in a new tab', () => {
    renderWithIntl(<DiscordSection />)
    const link = screen.getByRole('link', { name: 'Open Discord' })
    expect(link).toHaveAttribute('href', DISCORD_INVITE_URL)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('offers support email as a mailto link under the Discord button', () => {
    renderWithIntl(<DiscordSection />)
    const email = screen.getByRole('link', { name: 'support@wcpos.com' })
    expect(email).toHaveAttribute('href', 'mailto:support@wcpos.com')
    expect(email.closest('p')?.textContent).toBe('Prefer email? Write to support@wcpos.com.')
  })

  it('puts the link before the widget box', () => {
    renderWithIntl(<DiscordSection />)
    const link = screen.getByRole('link', { name: 'Open Discord' })
    const region = screen.getByRole('region', { name: 'Prefer to talk to a human?' })
    expect(link.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it.each(Object.entries(LOCALES))('labels the link from the %s client messages', (locale, all) => {
    render(
      <NextIntlClientProvider locale={locale as keyof typeof LOCALES} messages={clientMessages(all, ['support'])}>
        <DiscordSection />
      </NextIntlClientProvider>
    )
    const link = screen.getByRole('link', { name: all.support.discord.open })
    expect(link.textContent).not.toContain('support.discord')
    expect(screen.getByRole('link', { name: 'support@wcpos.com' })).toHaveAttribute('href', 'mailto:support@wcpos.com')
  })
})
