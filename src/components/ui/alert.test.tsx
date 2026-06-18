import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Alert } from './alert'

describe('Alert', () => {
  it('renders plain children directly when no slots are set', () => {
    render(<Alert tone="critical">Something went wrong</Alert>)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders a title above the body when title is set', () => {
    render(
      <Alert tone="caution" title="Heads up">
        details here
      </Alert>,
    )
    expect(screen.getByText('Heads up')).toBeInTheDocument()
    expect(screen.getByText('details here')).toBeInTheDocument()
  })

  it('renders an action slot', () => {
    render(
      <Alert tone="critical" action={<button>Retry</button>}>
        failed
      </Alert>,
    )
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('forwards a role for assertive announcements', () => {
    render(
      <Alert tone="critical" role="alert">
        boom
      </Alert>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('boom')
  })

  it('merges a custom className', () => {
    const { container } = render(<Alert className="mt-4">x</Alert>)
    expect((container.firstChild as HTMLElement).className).toContain('mt-4')
  })
})
