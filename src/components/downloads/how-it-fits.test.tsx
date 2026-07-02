import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HowItFits } from './how-it-fits'

describe('HowItFits', () => {
  it('renders the sync diagram with the hub and all four device spheres', () => {
    render(<HowItFits />)

    expect(
      screen.getByRole('img', { name: /connected over a REST API/ }),
    ).toBeInTheDocument()
    expect(screen.getByText('Your store')).toBeInTheDocument()
    for (const label of ['Desktop', 'iOS & iPad', 'Android', 'Web']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('keeps the explanation copy alongside the diagram', () => {
    render(<HowItFits />)

    expect(
      screen.getByRole('heading', {
        name: 'One store at the centre. Every till in sync.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('One plugin is the only setup')).toBeInTheDocument()
  })
})
