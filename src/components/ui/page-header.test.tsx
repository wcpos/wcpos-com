import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageHeader } from './page-header'

describe('PageHeader', () => {
  it('renders the title as an h1', () => {
    render(<PageHeader title="Licenses" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Licenses',
    )
  })

  it('renders an optional lede', () => {
    render(<PageHeader title="Orders" lede="Your purchase history" />)
    expect(screen.getByText('Your purchase history')).toBeInTheDocument()
  })

  it('omits the lede when not provided', () => {
    const { container } = render(<PageHeader title="Profile" />)
    expect(container.querySelector('p')).toBeNull()
  })

  it('renders an actions slot', () => {
    render(<PageHeader title="Downloads" actions={<button>New</button>} />)
    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument()
  })
})
