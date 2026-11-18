import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Collapsible } from './collapsible'

describe('Collapsible', () => {
  it('renders the summary and content', () => {
    render(
      <Collapsible summary={<span>More info</span>}>
        <p>hidden detail</p>
      </Collapsible>,
    )
    expect(screen.getByText('More info')).toBeInTheDocument()
    expect(screen.getByText('hidden detail')).toBeInTheDocument()
  })

  it('is closed by default and open when defaultOpen is set', () => {
    const { container, rerender } = render(
      <Collapsible summary="s">body</Collapsible>,
    )
    const details = container.querySelector('details') as HTMLDetailsElement
    expect(details.open).toBe(false)
    rerender(
      <Collapsible summary="s" defaultOpen>
        body
      </Collapsible>,
    )
    expect(
      (container.querySelector('details') as HTMLDetailsElement).open,
    ).toBe(true)
  })

  it('rotates a nested chevron only with its own disclosure', () => {
    const { container } = render(
      <Collapsible summary="outer" defaultOpen>
        <Collapsible summary="inner">inner body</Collapsible>
      </Collapsible>,
    )
    const [outer, inner] = Array.from(container.querySelectorAll('details'))
    expect(outer).toHaveAttribute('open')
    expect(inner).not.toHaveAttribute('open')
    const chevron = inner.querySelector(':scope > summary > svg') as SVGElement
    const classes = Array.from(chevron.classList)
    expect(classes).toContain('[[open]>summary>&]:rotate-180')
    expect(classes.some((c) => c.startsWith('group-open:'))).toBe(false)
  })
})
