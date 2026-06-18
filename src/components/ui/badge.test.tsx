import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './badge'

describe('Badge', () => {
  it('renders its label', () => {
    render(<Badge>New</Badge>)
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('keeps the pro and beta markers visually identical', () => {
    const { rerender, container } = render(<Badge variant="pro">Pro</Badge>)
    const pro = (container.firstChild as HTMLElement).className
    rerender(<Badge variant="beta">Beta</Badge>)
    const beta = (container.firstChild as HTMLElement).className
    expect(pro).toBe(beta)
  })

  it('exposes a brand tint pill on the sub-xs type token', () => {
    render(<Badge variant="brand-tint">Latest</Badge>)
    const el = screen.getByText('Latest')
    expect(el.className).toContain('bg-wcpos-red/10')
    expect(el.className).toContain('text-2xs')
  })
})
