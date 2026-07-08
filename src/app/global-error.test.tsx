import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import GlobalError from './global-error'

vi.mock('@/lib/client-logger', () => ({
  clientLogger: { error: vi.fn() },
}))

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

describe('GlobalError', () => {
  beforeEach(() => {
    // GlobalError renders its own <html>/<body>, which React flags as
    // invalid nesting inside the jsdom test container. Silence the
    // expected console noise (the component also logs the error itself).
    vi.spyOn(console, 'error').mockImplementation(() => {})
    setNavigatorLanguages(['en-US'])
  })

  it('renders the localized error state and retries via reset', async () => {
    const reset = vi.fn()
    const error = Object.assign(new Error('boom'), { digest: 'digest-1' })

    setNavigatorLanguages(['es-ES', 'en-US'])
    render(<GlobalError error={error} reset={reset} />)

    expect(
      await screen.findByRole('heading', { name: 'Algo salió mal.' })
    ).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('lang', 'es')
    expect(document.documentElement).toHaveAttribute('dir', 'ltr')

    fireEvent.click(screen.getByRole('button', { name: 'Intentar de nuevo' }))
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('links back to the localized homepage copy', async () => {
    setNavigatorLanguages(['fr-FR', 'en-US'])
    render(<GlobalError error={new Error('boom')} reset={vi.fn()} />)

    expect(
      await screen.findByRole('link', { name: 'Aller à l’accueil' })
    ).toHaveAttribute('href', '/')
  })

  it('logs the error to the console and clientLogger', async () => {
    const { clientLogger } = await import('@/lib/client-logger')
    const error = new Error('boom')

    render(<GlobalError error={error} reset={vi.fn()} />)

    expect(console.error).toHaveBeenCalledWith('Global error:', error)
    expect(clientLogger.error).toHaveBeenCalled()
  })
})
