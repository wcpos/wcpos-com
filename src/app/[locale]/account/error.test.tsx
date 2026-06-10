import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { clientLogger } from '@/lib/client-logger'
import AccountError from './error'

vi.mock('@/lib/client-logger', () => ({
  clientLogger: { error: vi.fn() },
}))

describe('AccountError', () => {
  it('renders the error state and retries via reset', () => {
    const reset = vi.fn()
    const error = Object.assign(new Error('boom'), { digest: 'digest-1' })

    render(<AccountError error={error} reset={reset} />)

    expect(
      screen.getByText('Something went wrong loading this page.')
    ).toBeInTheDocument()
    expect(clientLogger.error).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(reset).toHaveBeenCalledTimes(1)
  })
})
