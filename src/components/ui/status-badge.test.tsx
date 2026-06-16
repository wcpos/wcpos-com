import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './status-badge'

describe('StatusBadge', () => {
  it('renders its label', () => {
    render(<StatusBadge tone="active">Active</StatusBadge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows a decorative dot by default', () => {
    const { container } = render(<StatusBadge tone="active">Active</StatusBadge>)
    const dot = container.querySelector('[aria-hidden="true"]')
    expect(dot).not.toBeNull()
    expect(dot?.className).toContain('bg-green-500')
  })

  it('hides the dot when hideDot is set', () => {
    const { container } = render(
      <StatusBadge tone="danger" hideDot>
        Expired
      </StatusBadge>,
    )
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull()
  })

  it('applies the tone tint to the pill', () => {
    const { container } = render(<StatusBadge tone="active">Active</StatusBadge>)
    expect((container.firstChild as HTMLElement).className).toContain(
      'text-green-700',
    )
  })

  it('defaults to the neutral tone', () => {
    const { container } = render(<StatusBadge>Unknown</StatusBadge>)
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain('text-muted-foreground')
    expect(container.querySelector('[aria-hidden="true"]')?.className).toContain(
      'bg-muted-foreground',
    )
  })
})
