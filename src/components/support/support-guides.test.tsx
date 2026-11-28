import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactElement } from 'react'
import { clientMessages } from '@/i18n/client-messages'
import type { Locale } from '@/i18n/config'
import enMessages from '../../../messages/en.json'
import deMessages from '../../../messages/de.json'
import { SupportGuides } from './support-guides'
import { SupportDefaultContent } from './support-chat'

vi.mock('@/components/support/discord-widget', () => ({
  DiscordWidget: () => <div data-testid="discord-widget" />,
}))

const HREFS = [
  'https://docs.wcpos.com/getting-started/installation',
  'https://docs.wcpos.com/getting-started/pro-license',
  'https://docs.wcpos.com/hardware/barcode-scanners',
  'https://docs.wcpos.com/hardware/receipt-printers',
  'https://docs.wcpos.com/manage-store/products/product-sync',
]

function renderWithIntl(ui: ReactElement, locale: Locale = 'en', messages = enMessages) {
  return render(
    <NextIntlClientProvider locale={locale} messages={clientMessages(messages, ['support'])}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe('SupportGuides', () => {
  it('renders the guides heading and five docs links in order', () => {
    renderWithIntl(<SupportGuides />)
    const heading = screen.getByRole('heading', { level: 2, name: 'Start with these guides' })
    const block = heading.parentElement as HTMLElement
    const links = within(block).getAllByRole('link')
    expect(links.map((a) => a.getAttribute('href'))).toEqual(HREFS)
    expect(links.map((a) => a.textContent)).toEqual([
      'Install WCPOS on your WooCommerce store',
      'Activate your Pro license',
      'Set up a barcode scanner',
      'Set up a receipt printer',
      'How product sync works',
    ])
    for (const a of links) expect(a).not.toHaveAttribute('target')
  })

  it('renders the de title from the de messages', () => {
    renderWithIntl(<SupportGuides />, 'de', deMessages)
    expect(
      screen.getByRole('heading', { level: 2, name: 'Starte mit diesen Anleitungen' })
    ).toBeInTheDocument()
  })
})

describe('SupportDefaultContent', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      }
    )
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('puts the person panel straight after the Ask box and the guides after it', () => {
    renderWithIntl(<SupportDefaultContent />)
    const form = screen.getByRole('textbox').closest('form')!
    const discord = screen.getByRole('heading', { level: 2, name: 'Talk to a person' })
    const guides = screen.getByRole('heading', { level: 2, name: 'Start with these guides' })
    expect(form.compareDocumentPosition(discord) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(discord.compareDocumentPosition(guides) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
