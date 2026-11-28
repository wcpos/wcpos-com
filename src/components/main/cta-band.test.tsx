import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock i18n navigation Link as a simple anchor
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

import { CtaBand } from './cta-band'

describe('CtaBand', () => {
  it('renders the heading, subtitle and one button per action', () => {
    render(
      <CtaBand
        title="Ready to sell?"
        subtitle="Get started in minutes."
        actions={[
          { label: 'Try Demo', href: 'https://demo.wcpos.com/pos' },
          { label: 'Download', href: '/downloads', variant: 'inverse' },
        ]}
      />,
    )
    expect(
      screen.getByRole('heading', { name: 'Ready to sell?' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Get started in minutes.')).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('routes external hrefs to <a> and internal ones through Link', () => {
    render(
      <CtaBand
        title="T"
        subtitle="S"
        actions={[
          { label: 'External', href: 'https://demo.wcpos.com/pos' },
          { label: 'Internal', href: '/pro' },
        ]}
      />,
    )
    expect(screen.getByRole('link', { name: 'External' })).toHaveAttribute(
      'href',
      'https://demo.wcpos.com/pos',
    )
    expect(screen.getByRole('link', { name: 'Internal' })).toHaveAttribute(
      'href',
      '/pro',
    )
  })

  it('defaults actions to the brand-on-dark button register', () => {
    render(
      <CtaBand
        title="T"
        subtitle="S"
        actions={[{ label: 'Primary', href: '/x' }]}
      />,
    )
    expect(
      screen.getByRole('link', { name: 'Primary' }).className,
    ).toContain('bg-wcpos-red')
  })

  it('renders the optional text link after the last action button', () => {
    render(
      <CtaBand
        title="T"
        subtitle="S"
        actions={[
          { label: 'Try Demo', href: 'https://demo.wcpos.com/pos' },
          { label: 'Download', href: '/downloads', variant: 'inverse' },
        ]}
        link={{ label: 'Compare WooCommerce point of sale systems', href: '/compare' }}
      />,
    )
    const link = screen.getByRole('link', {
      name: 'Compare WooCommerce point of sale systems',
    })
    expect(link).toHaveAttribute('href', '/compare')
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(3)
    expect(links[2]).toBe(link)
    expect(
      screen
        .getByRole('link', { name: 'Download' })
        .compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('renders only the action links when no link is given', () => {
    render(
      <CtaBand
        title="T"
        subtitle="S"
        actions={[
          { label: 'Try Demo', href: 'https://demo.wcpos.com/pos' },
          { label: 'Download', href: '/downloads' },
        ]}
      />,
    )
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })
})
