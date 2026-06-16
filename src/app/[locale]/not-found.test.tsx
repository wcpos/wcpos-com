import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import NotFoundPage from './not-found'

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans' }),
  Geist_Mono: () => ({ variable: '--font-geist-mono' }),
}))

describe('NotFoundPage (localized)', () => {
  it('renders the 404 message', () => {
    render(<NotFoundPage />)

    expect(
      screen.getByRole('heading', { name: 'Page not found' })
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'The page you are looking for does not exist or may have moved.'
      )
    ).toBeInTheDocument()
  })

  it('links to home, pro, and support', () => {
    render(<NotFoundPage />)

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

describe('LocaleLayout metadata', () => {
  it('preserves the root social image for localized pages', async () => {
    const { metadata } = await import('./layout')

    expect(metadata.openGraph?.images).toEqual(['/opengraph-image.png'])
    expect(metadata.twitter?.images).toEqual(['/opengraph-image.png'])
  })
})
