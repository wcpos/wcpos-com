import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TextLink } from './text-link'

describe('TextLink', () => {
  it('renders an anchor with its href', () => {
    render(<TextLink href="/downloads">Get it</TextLink>)
    const link = screen.getByRole('link', { name: 'Get it' })
    expect(link).toHaveAttribute('href', '/downloads')
  })

  it('opens external links safely in a new tab', () => {
    render(<TextLink href="https://example.com/download">Download</TextLink>)
    const link = screen.getByRole('link', { name: 'Download' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders a trailing arrow when arrow is set', () => {
    const { container } = render(
      <TextLink href="#" arrow>
        Next
      </TextLink>,
    )
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('uses the accent brand colour', () => {
    render(<TextLink href="#">link</TextLink>)
    expect(screen.getByRole('link').className).toContain('text-wcpos-red-accent')
  })

  it('renders a child element when asChild is set', () => {
    render(
      <TextLink asChild>
        <button>Act</button>
      </TextLink>,
    )
    expect(screen.getByRole('button', { name: 'Act' })).toBeInTheDocument()
  })
})
