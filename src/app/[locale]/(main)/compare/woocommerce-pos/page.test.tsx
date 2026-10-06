import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import WoocommerceComparePage, { generateMetadata } from './page'

// The page reads ~100 keys; the test asserts structure, so identity-with-
// overrides keeps the mock small (matching the pattern in pro/page.test.tsx).
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => {
    const messages: Record<string, string> = {
      'woocommerce.metadata.title': 'Translated WooCommerce metadata title',
      'woocommerce.metadata.description':
        'Translated WooCommerce metadata description',
      'woocommerce.hero.title': 'Translated WooCommerce hero title',
      'woocommerce.shortAnswer.wcpos': 'Translated short answer for WCPOS',
      'woocommerce.faq.free.question': 'Translated free question',
      'woocommerce.faq.free.answer': 'Translated free answer',
      'woocommerce.glance.rows.countries.woocommerce':
        'Translated WooCommerce countries cell',
      'woocommerce.limits.offline': 'Translated WooCommerce offline limit',
    }
    return messages[key] ?? key
  }),
  setRequestLocale: vi.fn(),
}))

const params = Promise.resolve({ locale: 'en' })

describe('WoocommerceComparePage', () => {
  it('associates every comparison cell with headers', async () => {
    render(await WoocommerceComparePage({ params }))
    for (const table of screen.getAllByRole('table')) {
      for (const row of table.querySelectorAll('tbody tr')) {
        expect(row.firstElementChild?.matches('th[scope="row"]')).toBe(true)
      }
      const headers = table.querySelectorAll('thead th')
      expect(headers).toHaveLength(2)
      for (const header of headers) {
        expect(header).toHaveAttribute('scope', 'col')
        expect(header.textContent?.trim()).not.toBe('')
      }
    }
  })

  it('renders the hero, answer-first block, glance table and limits', async () => {
    render(await WoocommerceComparePage({ params }))

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Translated WooCommerce hero title',
      })
    ).toBeInTheDocument()
    expect(
      screen.getByText('Translated short answer for WCPOS')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Translated WooCommerce countries cell')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Translated WooCommerce offline limit')
    ).toBeInTheDocument()
    expect(screen.getAllByRole('table')).toHaveLength(1)
    // 10 glance rows + 1 header row.
    expect(screen.getAllByRole('row')).toHaveLength(11)
    expect(
      screen.queryByText('woocommerce.glance.rows.tapToPay.label')
    ).toBeNull()
    expect(
      screen.queryByText('woocommerce.glance.rows.reporting.label')
    ).toBeNull()
    expect(
      screen.queryByText('woocommerce.glance.rows.display.label')
    ).toBeNull()
    expect(screen.queryByText('woocommerce.limits.display')).toBeNull()
    expect(screen.queryByText('woocommerce.limits.reporting')).toBeNull()
    expect(screen.queryByText('woocommerce.woocommerceBetter.tapToPay')).toBeNull()
  })

  it('emits FAQPage and BreadcrumbList JSON-LD', async () => {
    const { container } = render(await WoocommerceComparePage({ params }))
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const [faq, breadcrumbs] = JSON.parse(script!.innerHTML)
    expect(faq['@type']).toBe('FAQPage')
    expect(faq.mainEntity).toHaveLength(6)
    expect(faq.mainEntity[0].name).toBe('Translated free question')
    expect(faq.mainEntity[0].acceptedAnswer.text).toBe('Translated free answer')
    expect(breadcrumbs['@type']).toBe('BreadcrumbList')
    expect(breadcrumbs.itemListElement[1].item).toBe(
      'https://wcpos.com/compare/woocommerce-pos'
    )
  })

  it('builds metadata from translated strings', async () => {
    const metadata = await generateMetadata({ params })
    expect(metadata.title).toBe('Translated WooCommerce metadata title')
    expect(metadata.description).toBe(
      'Translated WooCommerce metadata description'
    )
  })
})
