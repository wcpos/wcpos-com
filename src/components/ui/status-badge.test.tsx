import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './status-badge'

describe('StatusBadge', () => {
  it('renders its label', () => {
    render(<StatusBadge tone="positive">Active</StatusBadge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows a decorative dot by default', () => {
    const { container } = render(
      <StatusBadge tone="positive">Active</StatusBadge>
    )
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })

  it('hides the dot when hideDot is set', () => {
    const { container } = render(
      <StatusBadge tone="critical" hideDot>
        Expired
      </StatusBadge>
    )
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull()
  })

  it('defaults to a neutral marker while preserving the label', () => {
    const { container } = render(<StatusBadge>Unknown</StatusBadge>)
    expect(screen.getByText('Unknown')).toBeInTheDocument()
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })
})
