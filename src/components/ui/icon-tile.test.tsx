import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { IconTile } from './icon-tile'

describe('IconTile', () => {
  it('renders its icon child', () => {
    const { getByTestId } = render(
      <IconTile>
        <svg data-testid="icon" />
      </IconTile>,
    )
    expect(getByTestId('icon')).toBeInTheDocument()
  })

  it('is decorative (aria-hidden) by default', () => {
    const { container } = render(
      <IconTile>
        <svg />
      </IconTile>,
    )
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('applies size + shape + tone classes', () => {
    const { container } = render(
      <IconTile size="lg" shape="round" tone="brand">
        <svg />
      </IconTile>,
    )
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('h-12')
    expect(el.className).toContain('rounded-full')
    expect(el.className).toContain('bg-wcpos-red/10')
  })
})
