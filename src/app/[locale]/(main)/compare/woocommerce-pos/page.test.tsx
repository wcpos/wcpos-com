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
      'woocommerce.glance.rows.tapToPay.woocommerce':
        'Translated WooCommerce Tap to Pay cell',
      'woocommerce.limits.offline': 'Translated WooCommerce offline limit',
    }
    return messages[key] ?? key
  }),
  setRequestLocale: vi.fn(),
}))

const params = Promise.resolve({ locale: 'en' })

describe('WoocommerceComparePage', () => {
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
      screen.getByText('Translated WooCommerce Tap to Pay cell')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Translated WooCommerce offline limit')
    ).toBeInTheDocument()
    expect(screen.getAllByRole('table')).toHaveLength(1)
    // 13 glance rows + 1 header row.
    expect(screen.getAllByRole('row')).toHaveLength(14)
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
