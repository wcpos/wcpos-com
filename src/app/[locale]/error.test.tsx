import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import LocaleError from './error'

vi.mock('@/lib/client-logger', () => ({
  clientLogger: { error: vi.fn() },
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('LocaleError', () => {
  it('renders the error state and retries via reset', () => {
    const reset = vi.fn()
    const error = Object.assign(new Error('boom'), { digest: 'digest-1' })

    render(<LocaleError error={error} reset={reset} />)

    expect(screen.getByText('Something went wrong.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('links back to the homepage', () => {
    render(<LocaleError error={new Error('boom')} reset={vi.fn()} />)

    expect(
      screen.getByRole('link', { name: 'Go to homepage' })
    ).toHaveAttribute('href', '/')
  })

  it('logs the error via clientLogger', async () => {
    const { clientLogger } = await import('@/lib/client-logger')

    render(<LocaleError error={new Error('boom')} reset={vi.fn()} />)

    expect(clientLogger.error).toHaveBeenCalled()
  })
})
