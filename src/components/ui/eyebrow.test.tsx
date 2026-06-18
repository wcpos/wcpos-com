import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Eyebrow } from './eyebrow'

describe('Eyebrow', () => {
  it('renders its text uppercased via tracking class', () => {
    render(<Eyebrow>Features</Eyebrow>)
    const el = screen.getByText('Features')
    expect(el.className).toContain('uppercase')
    expect(el.className).toContain('tracking-wider')
  })

  it('defaults to the brand tone', () => {
    render(<Eyebrow>Brand</Eyebrow>)
    expect(screen.getByText('Brand').className).toContain('text-wcpos-red')
  })

  it('supports a muted tone for field labels', () => {
    render(<Eyebrow tone="muted">Label</Eyebrow>)
    expect(screen.getByText('Label').className).toContain(
      'text-muted-foreground',
    )
  })

  it('can render as a different element', () => {
    render(<Eyebrow as="span">Inline</Eyebrow>)
    expect(screen.getByText('Inline').tagName).toBe('SPAN')
  })
})
