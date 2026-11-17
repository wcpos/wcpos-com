import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

vi.mock('@/lib/analytics/client-events', () => ({
  trackClientEvent: vi.fn(),
}))

vi.mock('next-intl', () => {
  type RichValue = string | ((chunks: React.ReactNode) => React.ReactNode)
  return {
    useTranslations: (namespace: string) => {
      const t = (key: string) => `${namespace}.${key}`
      t.rich = (key: string, values?: Record<string, RichValue>) => {
        if (key !== 'pluginNotice') return `${namespace}.${key}`
        const plugin = values?.plugin
        return [
          'Every app connects to ',
          typeof plugin === 'function' ? plugin('the mocked free plugin') : null,
          ' — install it first.',
        ]
      }
      return t
    },
  }
})

import { trackClientEvent } from '@/lib/analytics/client-events'
import { DownloadsHero } from './download-hero'

const mockTrackClientEvent = vi.mocked(trackClientEvent)

function getPluginLink() {
  return screen.getByRole('link', { name: 'the mocked free plugin' })
}

describe('DownloadsHero', () => {
  it('renders the plugin notice link exactly once', () => {
    render(<DownloadsHero desktopVersion="2.0.0" />)
    expect(
      screen.getAllByRole('link', { name: 'the mocked free plugin' }),
    ).toHaveLength(1)
  })

  it('puts the plugin notice inside the card, above the primary download link', () => {
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

  it('tracks a click on the plugin link', () => {
    render(<DownloadsHero desktopVersion="2.0.0" />)
    fireEvent.click(getPluginLink())
    expect(mockTrackClientEvent).toHaveBeenCalledWith('download_clicked', {
      plugin: 'free',
      source: 'wordpress_org',
      page: '/downloads',
    })
  })
})
