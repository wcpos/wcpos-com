import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import GlobalError from './global-error'

vi.mock('@/lib/client-logger', () => ({
  clientLogger: { error: vi.fn() },
}))

describe('GlobalError', () => {
  beforeEach(() => {
    // GlobalError renders its own <html>/<body>, which React flags as
    // invalid nesting inside the jsdom test container. Silence the
    // expected console noise (the component also logs the error itself).
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders the error state and retries via reset', () => {
    const reset = vi.fn()
    const error = Object.assign(new Error('boom'), { digest: 'digest-1' })

    render(<GlobalError error={error} reset={reset} />)

    expect(
      screen.getByRole('heading', { name: 'Something went wrong' })
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('links back to the homepage', () => {
    render(<GlobalError error={new Error('boom')} reset={vi.fn()} />)

    expect(
      screen.getByRole('link', { name: 'Go to homepage' })
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
