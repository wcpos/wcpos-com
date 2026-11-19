import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import en from '../../../messages/en.json'
import { ProBuyBoxFooter } from './pro-buy-box-footer'

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

const t = (key: string) =>
  key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown>)[part],
      en.pro
    ) as string

describe('ProBuyBoxFooter', () => {
  it('links to the free downloads', () => {
    render(<ProBuyBoxFooter t={t} />)
    expect(
      screen.getByRole('link', { name: 'Try the free version first' })
    ).toHaveAttribute('href', '/downloads')
  })

  it('links to the live demo in the same tab, after the free link', () => {
    render(<ProBuyBoxFooter t={t} />)
    const free = screen.getByRole('link', { name: 'Try the free version first' })
    const demo = screen.getByRole('link', { name: 'See Pro in the live demo' })
    expect(demo).toHaveAttribute('href', 'https://demo.wcpos.com/pos')
    expect(demo).not.toHaveAttribute('target')
    expect(
      free.compareDocumentPosition(demo) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('tells visitors the demo credentials', () => {
    render(<ProBuyBoxFooter t={t} />)
    expect(screen.getByText(/log in with demo \/ demo/)).toBeInTheDocument()
  })
})
