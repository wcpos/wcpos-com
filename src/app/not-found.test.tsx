import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import RootNotFound from './not-found'

function setNavigatorLanguages(languages: readonly string[]) {
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    value: languages,
  })
  Object.defineProperty(window.navigator, 'language', {
    configurable: true,
    value: languages[0],
  })
}

describe('RootNotFound', () => {
  beforeEach(() => {
    // RootNotFound renders its own <html>/<body>, which React flags as
    // invalid nesting inside the jsdom test container. Silence the
    // expected console noise.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    setNavigatorLanguages(['en-US'])
  })

  it('renders the localized 404 message from browser language preferences', async () => {
    setNavigatorLanguages(['de-DE', 'en-US'])

    render(<RootNotFound />)

    expect(
      await screen.findByRole('heading', { name: 'Seite nicht gefunden' })
    ).toBeInTheDocument()
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('links to home, pro, and support with localized labels', async () => {
    setNavigatorLanguages(['pt-BR', 'en-US'])

    render(<RootNotFound />)

    expect(
      await screen.findByRole('link', { name: 'Ir para a página inicial' })
    ).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'WCPOS Pro' })).toHaveAttribute(
      'href',
      '/pro'
    )
    expect(screen.getByRole('link', { name: 'Suporte' })).toHaveAttribute(
      'href',
      '/support'
    )
  })
})
