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
