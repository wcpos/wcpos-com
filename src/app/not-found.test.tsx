import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import RootNotFound from './not-found'

describe('RootNotFound', () => {
  beforeEach(() => {
    // RootNotFound renders its own <html>/<body>, which React flags as
    // invalid nesting inside the jsdom test container. Silence the
    // expected console noise.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders the 404 message', () => {
    render(<RootNotFound />)

    expect(
      screen.getByRole('heading', { name: 'Page not found' })
    ).toBeInTheDocument()
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('links to home, pro, and support', () => {
    render(<RootNotFound />)

    expect(
      screen.getByRole('link', { name: 'Go to homepage' })
    ).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'WCPOS Pro' })).toHaveAttribute(
      'href',
      '/pro'
    )
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute(
      'href',
      '/support'
    )
  })
})
