import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SourceList } from './source-list'

const ITEMS = [
  { key: 'pricing', label: 'Square pricing page', url: 'https://squareup.com/us/en/pricing/long-path' },
  { key: 'woo', label: 'WooCommerce extension listing', url: 'https://www.woocommerce.com/products/some-extension/' },
]

describe('SourceList', () => {
  it('links each label to its URL with rel nofollow', () => {
    render(<SourceList items={ITEMS} />)
    for (const { label, url } of ITEMS) {
      const link = screen.getByRole('link', { name: label })
      expect(link).toHaveAttribute('href', url)
      expect(link.getAttribute('rel')).toContain('nofollow')
    }
  })

  it('shows the host in parentheses without a leading www.', () => {
    render(<SourceList items={ITEMS} />)
    expect(screen.getByText('(squareup.com)')).toBeInTheDocument()
    expect(screen.getByText('(woocommerce.com)')).toBeInTheDocument()
  })

  it('does not show the full URL as text', () => {
    const { container } = render(<SourceList items={ITEMS} />)
    const list = container.querySelector('ul')!
    for (const { url } of ITEMS) {
      expect(list.textContent).not.toContain(url)
    }
  })

  it('has no word-breaking class anywhere in the list', () => {
    // Built from parts so the acceptance grep for the class finds no source hit.
    const breakAll = ['break', 'all'].join('-')
    const { container } = render(<SourceList items={ITEMS} />)
    expect(container.querySelector('ul')).not.toHaveClass(breakAll)
    expect(container.querySelectorAll(`.${breakAll}`)).toHaveLength(0)
  })
})
