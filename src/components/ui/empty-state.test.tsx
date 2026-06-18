import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from './empty-state'

describe('EmptyState', () => {
  it('renders the title and description', () => {
    render(
      <EmptyState
        icon={<svg />}
        title="No licenses yet"
        description="Buy Pro to get a license."
      />,
    )
    expect(screen.getByText('No licenses yet')).toBeInTheDocument()
    expect(screen.getByText('Buy Pro to get a license.')).toBeInTheDocument()
  })

  it('renders an action when provided', () => {
    render(
      <EmptyState
        icon={<svg />}
        title="Empty"
        action={<button>Browse</button>}
      />,
    )
    expect(screen.getByRole('button', { name: 'Browse' })).toBeInTheDocument()
  })

  it('tints the disc amber in the caution tone', () => {
    const { container } = render(
      <EmptyState icon={<svg />} title="Error" tone="caution" />,
    )
    // The IconTile disc carries the caution amber tint.
    expect(container.innerHTML).toContain('amber')
  })
})
