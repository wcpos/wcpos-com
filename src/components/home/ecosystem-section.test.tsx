import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactElement } from 'react'
import { EcosystemSection } from './ecosystem-section'
import messages from '../../../messages/en.json'

function renderWithIntl(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe('EcosystemSection', () => {
  it('renders the section heading', () => {
    renderWithIntl(<EcosystemSection />)

    expect(
      screen.getByRole('heading', {
        name: 'One ecosystem. Multiple ways to sell.',
      })
    ).toBeInTheDocument()
  })

  it('renders a card for each platform', () => {
    renderWithIntl(<EcosystemSection />)

    expect(screen.getByText('iOS & iPadOS')).toBeInTheDocument()
    expect(screen.getByText('Android')).toBeInTheDocument()
    expect(screen.getByText('Windows & macOS')).toBeInTheDocument()
    expect(screen.getByText('Web Browser')).toBeInTheDocument()
  })

  it('links each platform CTA to a real download target', () => {
    renderWithIntl(<EcosystemSection />)

    expect(
      screen.getByRole('link', { name: /Get the iOS beta/ })
    ).toHaveAttribute('href', 'https://testflight.apple.com/join/JGBdVRrW')
    expect(
      screen.getByRole('link', { name: /Get the Android beta/ })
    ).toHaveAttribute(
      'href',
      'https://play.google.com/apps/testing/com.wcpos.main'
    )
    expect(
      screen.getByRole('link', { name: /Download for Desktop/ })
    ).toHaveAttribute('href', 'https://github.com/wcpos/electron/releases')
    expect(
      screen.getByRole('link', { name: /Try Live Demo/ })
    ).toHaveAttribute('href', 'https://demo.wcpos.com/pos')
  })

  it('marks beta platforms with a badge', () => {
    renderWithIntl(<EcosystemSection />)

    expect(screen.getAllByText('Beta')).toHaveLength(3)
  })
})
