import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Progress } from './progress'

describe('Progress', () => {
  it('exposes the rounded percentage as a progressbar', () => {
    render(<Progress value={3} max={4} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '75')
  })

  it('clamps values above the max to 100', () => {
    render(<Progress value={120} max={100} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100',
    )
  })

  it('clamps negative values to 0', () => {
    render(<Progress value={-10} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '0',
    )
  })

  it('handles a zero max without dividing by zero', () => {
    render(<Progress value={5} max={0} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '0',
    )
  })
})
