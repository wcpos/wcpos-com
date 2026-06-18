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
})
