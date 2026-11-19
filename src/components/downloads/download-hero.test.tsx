import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

vi.mock('@/lib/analytics/client-events', () => ({
  trackClientEvent: vi.fn(),
}))

vi.mock('next-intl', () => {
  return {
    useTranslations: (namespace: string) => {
      const t = (key: string) => `${namespace}.${key}`
      t.rich = (key: string) => `${namespace}.${key}`
      return t
    },
  }
})

import { trackClientEvent } from '@/lib/analytics/client-events'
import { DownloadsHero } from './download-hero'
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
const PLUGIN_URL = 'https://wordpress.org/plugins/woocommerce-pos/'
const PLUGIN_BUTTON = 'downloads.page.steps.plugin.title'

const mockTrackClientEvent = vi.mocked(trackClientEvent)

function getPluginLink() {
  return screen.getByRole('link', { name: PLUGIN_BUTTON })
}

describe('DownloadsHero', () => {
  it('renders the tagline after the level-1 heading', () => {
    render(<DownloadsHero desktopVersion="2.0.0" />)
    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'downloads.hero.title',
    })
    const tagline = screen.getByText('downloads.hero.tagline')
    expect(
      heading.compareDocumentPosition(tagline) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('links to the plugin exactly once, from the plugin button', () => {
    render(<DownloadsHero desktopVersion="2.0.0" />)
    const pluginLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href') === PLUGIN_URL)
    expect(pluginLinks).toHaveLength(1)
    expect(pluginLinks[0]).toBe(getPluginLink())
  })

  it('puts the plugin button inside the card, above the primary download link', () => {
    render(<DownloadsHero desktopVersion="2.0.0" />)
    const pluginLink = getPluginLink()
    const primaryLink = screen.getByRole('link', {
      name: /^downloads\.platforms\.[\w-]+\.action$/,
    })
    const card = primaryLink.closest('[aria-live="polite"]')
    expect(card).not.toBeNull()
    expect(card).toContainElement(pluginLink)
    expect(
      pluginLink.compareDocumentPosition(primaryLink) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('tracks a click on the plugin button', () => {
    render(<DownloadsHero desktopVersion="2.0.0" />)
    fireEvent.click(getPluginLink())
    expect(mockTrackClientEvent).toHaveBeenCalledWith('download_clicked', {
      plugin: 'free',
      source: 'wordpress_org',
      page: '/downloads',
    })
  })

  it('shows the en upgrade note for the default platform and for web', () => {
    expect(en.downloads.hero.upgradeNote).toBe(
      'Upgrading from 1.11? Sync every register first: 2.0 starts a new local database and does not carry over unsent sales.',
    )
    render(<DownloadsHero desktopVersion="2.0.0" />)
    expect(screen.getByTestId('upgrade-note')).toHaveTextContent(
      'downloads.hero.upgradeNote',
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'downloads.platforms.web.name' }),
    )
    screen.getByRole('link', { name: 'downloads.platforms.web.action' })
    expect(screen.getByTestId('upgrade-note')).toHaveTextContent(
      'downloads.hero.upgradeNote',
    )
  })

  it('puts the upgrade note after the platform download button', () => {
    render(<DownloadsHero desktopVersion="2.0.0" />)
    const primaryLink = screen.getByRole('link', {
      name: /^downloads\.platforms\.[\w-]+\.action$/,
    })
    expect(
      primaryLink.compareDocumentPosition(screen.getByTestId('upgrade-note')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it.each(Object.entries(LOCALES))(
    '%s: plugin notice is plain text and the button label exists',
    (_locale, messages) => {
      expect(messages.downloads.hero.pluginNotice).not.toMatch(/<\/?plugin>/)
      const label = messages.downloads.page.steps.plugin.title
      expect(typeof label).toBe('string')
      expect(label.trim()).not.toBe('')
    },
  )
})
