import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Card } from './card'

describe('Card', () => {
  it('is flat with the tight radius by default', () => {
    const { container } = render(<Card>flat</Card>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('rounded-md')
    expect(el.className).not.toContain('shadow-lg')
  })

  it('opts into elevation with the raised radius + shadow', () => {
    const { container } = render(<Card elevated>raised</Card>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('rounded-lg')
    expect(el.className).toContain('shadow-lg')
  })

  it('adds a hover hairline when interactive', () => {
    const { container } = render(<Card interactive>click</Card>)
    expect((container.firstChild as HTMLElement).className).toContain(
      'hover:border-foreground/20',
    )
  })
})
