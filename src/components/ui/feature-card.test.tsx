import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Search } from 'lucide-react'
import { FeatureCard } from './feature-card'
import { Badge } from './badge'

describe('FeatureCard', () => {
  it('renders title and description', () => {
    render(
      <FeatureCard icon={Search} title="Fast search">
        Find products instantly.
      </FeatureCard>,
    )
    expect(
      screen.getByRole('heading', { name: 'Fast search' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Find products instantly.')).toBeInTheDocument()
  })

  it('renders an optional badge next to the title', () => {
    render(
      <FeatureCard
        icon={Search}
        title="Checkout"
        badge={<Badge variant="pro">Pro</Badge>}
      >
        Payments.
      </FeatureCard>,
    )
    expect(screen.getByText('Pro')).toBeInTheDocument()
  })

  it('keeps the badge inline inside the heading', () => {
    render(
      <FeatureCard
        icon={Search}
        title="Checkout"
        badge={<Badge variant="pro">Pro</Badge>}
      >
        Payments.
      </FeatureCard>,
    )
    const heading = screen.getByRole('heading')
    const badge = screen.getByTestId('feature-card-badge')
    expect(heading).not.toHaveClass('flex')
    expect(heading).toContainElement(badge)
    expect(badge).toHaveClass('inline-block')
  })

  it('keeps the badge on the same line as the last word of a long title', () => {
    const title = 'Reports across days, registers & stores'
    render(
      <FeatureCard icon={Search} title={title} badge={<Badge variant="pro">Pro</Badge>}>
        Body.
      </FeatureCard>,
    )
    const nowrap = screen.getByTestId('feature-card-badge').parentElement
    expect(nowrap).toHaveClass('whitespace-nowrap')
    expect(nowrap).toHaveTextContent(/^storesPro$/)
    expect(screen.getByRole('heading', { name: new RegExp(title) })).toBeInTheDocument()
  })

  it('adds no nowrap wrapper for a one-word title', () => {
    const { container } = render(
      <FeatureCard icon={Search} title="Checkout" badge={<Badge variant="pro">Pro</Badge>}>
        Body.
      </FeatureCard>,
    )
    expect(container.querySelector('.whitespace-nowrap')).toBeNull()
  })

  it('adds no nowrap wrapper without a badge', () => {
    const { container } = render(
      <FeatureCard icon={Search} title="Reports across days, registers & stores">
        Body.
      </FeatureCard>,
    )
    expect(container.querySelector('.whitespace-nowrap')).toBeNull()
  })

  it('can render as a list item for grid <ul>s', () => {
    render(
      <ul>
        <FeatureCard as="li" icon={Search} title="In a list">
          Body.
        </FeatureCard>
      </ul>,
    )
    expect(screen.getByRole('listitem')).toBeInTheDocument()
  })

  it('wraps the icon in an IconTile by default', () => {
    const { container } = render(
      <FeatureCard icon={Search} title="Tiled">
        Body.
      </FeatureCard>,
    )
    expect(container.querySelector('span svg')).not.toBeNull()
  })

  it('draws the icon bare when iconStyle is plain', () => {
    const { container } = render(
      <FeatureCard icon={Search} iconStyle="plain" title="Plain">
        Body.
      </FeatureCard>,
    )
    // no IconTile wrapper span in plain mode
    expect(container.querySelector('span')).toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
  })
})
