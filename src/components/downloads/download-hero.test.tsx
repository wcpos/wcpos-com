import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

vi.mock('next-intl', async () => {
  const { Fragment } = await import('react')
  type Rich = Record<string, string | ((chunks: string) => React.ReactNode)>
  return {
    useTranslations: (namespace: string) => {
      const t = (key: string) => `${namespace}.${key}`
      // Render every tag function with a marker chunk so its element is visible.
      t.rich = (key: string, values: Rich = {}) => (
        <>
          {`${namespace}.${key}`}
          {Object.entries(values).map(([tag, render]) =>
            typeof render === 'function' ? (
              <Fragment key={tag}>{render(`${namespace}.${key}.${tag}`)}</Fragment>
            ) : null,
          )}
        </>
      )
      return t
    },
  }
})

import { PlatformPicker } from './download-hero'
import en from '../../../messages/en.json'

const SETUP_GUIDE = 'https://docs.wcpos.com/getting-started/installation'

function onPlatform(platform: string) {
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform)
}

function primaryLink() {
  return screen.getByRole('link', { name: /^downloads\.platforms\.[\w-]+\.action$/ })
}

afterEach(() => vi.restoreAllMocks())

describe('PlatformPicker', () => {
  it('presses the detected macOS tile and marks it Detected', () => {
    onPlatform('MacIntel')
    render(<PlatformPicker desktopVersion="2.0.6" />)
    expect(screen.getByRole('button', { name: /mac-arm\.name/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('downloads.hero.detected')).toBeInTheDocument()
    expect(primaryLink()).toHaveAttribute(
      'href',
      'https://updates.wcpos.com/v1/electron/download/darwin-arm64',
    )
  })

  it('puts the upgrade notice above the download, with a link to the 2.0.0 notes', () => {
    onPlatform('MacIntel')
    render(<PlatformPicker desktopVersion="2.0.6" />)
    const note = screen.getByTestId('upgrade-note')
    expect(note).toHaveClass('bg-amber-50')
    expect(
      note.compareDocumentPosition(primaryLink()) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(within(note).getByRole('link')).toHaveAttribute(
      'href',
      'https://github.com/wcpos/woocommerce-pos/releases/tag/v2.0.0',
    )
  })

  it('drops the Detected badge when another tile is picked', () => {
    onPlatform('MacIntel')
    render(<PlatformPicker desktopVersion="2.0.6" />)
    fireEvent.click(screen.getByRole('button', { name: /win\.name/ }))
    expect(screen.queryByText('downloads.hero.detected')).toBeNull()
    expect(primaryLink()).toHaveAttribute(
      'href',
      'https://updates.wcpos.com/v1/electron/download/win32-x64',
    )
  })

  it('sends Web to the setup guide, with the live demo in the note', () => {
    onPlatform('MacIntel')
    render(<PlatformPicker desktopVersion="2.0.6" />)
    fireEvent.click(screen.getByRole('button', { name: /web\.name/ }))
    expect(primaryLink()).toHaveAttribute('href', SETUP_GUIDE)
    expect(screen.getByRole('link', { name: /webNote\.demo/ })).toHaveAttribute(
      'href',
      'https://demo.wcpos.com/pos',
    )
    expect(screen.getByTestId('upgrade-note')).toBeInTheDocument()
  })

  it('marks iOS as a beta and explains the TestFlight wait', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')
    render(<PlatformPicker desktopVersion="2.0.6" />)
    expect(screen.getByText('downloads.page.beta')).toBeInTheDocument()
    expect(screen.getByText('downloads.hero.iosNote')).toBeInTheDocument()
  })

  it('lists every build, presses no tile and keeps the notice when the device is unknown', () => {
    onPlatform('')
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('')
    render(<PlatformPicker desktopVersion="2.0.6" />)
    for (const tile of screen.getAllByRole('button')) {
      expect(tile).toHaveAttribute('aria-pressed', 'false')
    }
    expect(screen.getByText('downloads.hero.pickTitle')).toBeInTheDocument()
    expect(screen.queryByText('downloads.hero.detected')).toBeNull()
    expect(screen.queryByRole('link', { name: /\.action$/ })).toBeNull()
    expect(screen.getAllByRole('link', { name: /\.listLabel$/ })).toHaveLength(6)
    expect(screen.getByTestId('upgrade-note')).toBeInTheDocument()
  })

  it('keeps the en upgrade wording and adds the both-on-2.0 line', () => {
    expect(en.downloads.hero.upgradeNote).toBe(
      '<title>Updating from 1.11?</title> Sync every register first: 2.0 starts a new local database and does not carry over unsent sales. The plugin and every app must both be on 2.0. <notes>Read the 2.0.0 notes</notes>',
    )
  })
})
