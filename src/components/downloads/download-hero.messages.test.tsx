import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

vi.mock('@/lib/analytics/client-events', () => ({
  trackClientEvent: vi.fn(),
}))

import { clientMessages } from '@/i18n/client-messages'
import { DownloadsHero } from './download-hero'
import { DOWNLOADS_CLIENT_MESSAGES } from './client-messages'
import de from '../../../messages/de.json'
import en from '../../../messages/en.json'
import es from '../../../messages/es.json'
import fr from '../../../messages/fr.json'
import it_ from '../../../messages/it.json'
import ja from '../../../messages/ja.json'
import ko from '../../../messages/ko.json'
import nl from '../../../messages/nl.json'
import pt from '../../../messages/pt.json'
import zh from '../../../messages/zh.json'

const LOCALES = { en, de, nl, fr, es, it: it_, pt, ja, ko, zh }
const CASES = Object.entries(LOCALES) as [
  keyof typeof LOCALES,
  typeof en,
][]
const PLUGIN_URL = 'https://wordpress.org/plugins/woocommerce-pos/'

describe('DownloadsHero with the /downloads client messages', () => {
  it.each(CASES)(
    'renders no raw message keys in %s',
    (locale, messages) => {
      render(
        <NextIntlClientProvider
          locale={locale}
          messages={clientMessages(messages, DOWNLOADS_CLIENT_MESSAGES)}
          timeZone="UTC"
          onError={() => {}}
        >
          <DownloadsHero desktopVersion="2.0.0" />
        </NextIntlClientProvider>,
      )

      expect(document.body.textContent).not.toMatch(
        /downloads\.(hero|platforms|page)\./,
      )
      const pluginLink = screen
        .getAllByRole('link')
        .find((link) => link.getAttribute('href') === PLUGIN_URL)
      expect(pluginLink).toHaveTextContent(
        messages.downloads.page.steps.plugin.title,
      )
    },
  )
})
