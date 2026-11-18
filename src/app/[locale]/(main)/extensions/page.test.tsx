import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { EXTENSIONS } from '@/lib/extensions-catalog'
import ExtensionsPage, { EXTENSION_GROUPS, PAYMENTS_LAST, generateMetadata } from './page'

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(
    async () => (key: string, values: Record<string, string>) => {
      const messages: Record<string, string> = {
        'metadata.title': 'Translated extensions metadata title',
        'metadata.description': 'Translated extensions metadata description',
        'hero.title': 'Translated extensions hero title',
        'hero.subtitle': 'Translated extensions hero subtitle',
        'groups.payments': 'Translated payments heading',
        'groups.stockCoupons': 'Translated stock and coupons heading',
        'groups.multilingual': 'Translated multilingual heading',
        proTag: 'Pro',
        englishNotice: 'Translated English content notice',
        allDocsLink: 'Translated all extensions documentation',
        docsLinkShort: 'Translated docs',
      }
      return key === 'docsLink' ? `Docs for ${values.name}` : messages[key] ?? key
    }
  ),
  setRequestLocale: vi.fn(),
}))

const EXPECTED = [
  {
    name: 'Email Invoice Gateway',
    docsUrl: 'https://docs.wcpos.com/payment/gateways/email-invoice',
    pro: true,
  },
  {
    name: 'Mercado Pago Terminal for WooCommerce',
    docsUrl: 'https://docs.wcpos.com/payment/gateways/mercadopago-terminal',
    pro: true,
  },
  {
    name: 'Mollie Terminal for WooCommerce',
    docsUrl: 'https://docs.wcpos.com/payment/gateways/mollie-terminal',
    pro: true,
  },
  {
    name: 'PayArc Terminal for WooCommerce',
    docsUrl: 'https://docs.wcpos.com/payment/gateways/payarc-terminal',
    pro: true,
  },
  {
    name: 'PayPal Reader for WooCommerce',
    docsUrl: 'https://docs.wcpos.com/payment/gateways/paypal-reader',
    pro: true,
  },
  {
    name: 'Square Terminal for WooCommerce',
    docsUrl: 'https://docs.wcpos.com/payment/gateways/square-terminal',
    pro: true,
  },
  {
    name: 'Stripe Terminal for WooCommerce',
    docsUrl: 'https://docs.wcpos.com/payment/gateways/stripe-terminal',
    pro: true,
  },
  {
    name: 'SumUp Terminal for WooCommerce',
    docsUrl: 'https://docs.wcpos.com/payment/gateways/sumup-terminal',
    pro: true,
  },
  {
    name: 'WCPOS ATUM Integration',
    docsUrl: 'https://docs.wcpos.com/extensions/atum',
    pro: true,
  },
  {
    name: 'WCPOS Polylang',
    docsUrl: 'https://docs.wcpos.com/extensions/polylang',
    pro: false,
  },
  {
    name: 'WCPOS StoreApps Smart Coupons',
    docsUrl: 'https://docs.wcpos.com/extensions/storeapps-smart-coupons',
    pro: true,
  },
  {
    name: 'WCPOS Vipps MobilePay',
    docsUrl: 'https://docs.wcpos.com/payment/gateways/vipps-mobilepay',
    pro: true,
  },
  {
    name: 'WCPOS WP Multilang',
    docsUrl: 'https://docs.wcpos.com/extensions/wp-multilang',
    pro: false,
  },
  {
    name: 'WCPOS WPML',
    docsUrl: 'https://docs.wcpos.com/extensions/wpml',
    pro: false,
  },
  {
    name: 'Windcave Terminal for WooCommerce',
    docsUrl: 'https://docs.wcpos.com/payment/gateways/windcave-terminal',
    pro: true,
  },
]

// Indexes into EXPECTED (catalog order), listed in page order: catalog order,
// with the non-terminal payment gateways moved to the end of their group.
const EXPECTED_GROUPS = [
  { heading: 'Translated payments heading', entries: [1, 2, 3, 4, 5, 6, 7, 14, 0, 11] },
  { heading: 'Translated stock and coupons heading', entries: [8, 10] },
  { heading: 'Translated multilingual heading', entries: [9, 12, 13] },
]

const params = Promise.resolve({ locale: 'en' })

describe('ExtensionsPage', () => {
  it('renders the translated hero heading', async () => {
    render(await ExtensionsPage({ params }))
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Translated extensions hero title',
      })
    ).toBeInTheDocument()
  })

  it('renders all 15 catalog entries with their documentation, in catalog order except payments gateways after the terminals', async () => {
    render(await ExtensionsPage({ params }))
    const lists = screen.getAllByRole('list')
    expect(lists.flatMap((list) => within(list).getAllByRole('listitem'))).toHaveLength(15)
    EXPECTED_GROUPS.forEach(({ heading, entries }) => {
      const group = within(screen.getByRole('region', { name: heading }))
      const items = within(group.getByRole('list')).getAllByRole('listitem')
      expect(items).toHaveLength(entries.length)
      entries.forEach((entry, index) => {
        const { name, docsUrl } = EXPECTED[entry]
        const card = within(items[index])
        expect(card.getByRole('heading', { level: 3, name })).toBeInTheDocument()
        expect(card.getByRole('link', { name: `Docs for ${name}` })).toHaveAttribute(
          'href', docsUrl
        )
      })
    })
  })

  it('shows a short documentation link and keeps the extension name in its accessible name', async () => {
    render(await ExtensionsPage({ params }))
    EXTENSIONS.forEach(({ name, docsUrl }) => {
      const link = screen.getByRole('link', { name: `Docs for ${name}` })
      expect(link).toHaveAttribute('href', docsUrl)
      expect(link.textContent).toBe('Translated docs')
      expect(link.className).toContain('whitespace-nowrap')
    })
  })

  it('shows three group headings in order, with the 10 payments entries under the first', async () => {
    render(await ExtensionsPage({ params }))
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
    ).toEqual(EXPECTED_GROUPS.map(({ heading }) => heading))
    const payments = within(
      screen.getByRole('region', { name: 'Translated payments heading' })
    ).getAllByRole('heading', { level: 3 })
    const catalogPayments = EXTENSIONS.filter(({ category }) => category === 'payments')
    expect(catalogPayments).toHaveLength(10)
    const isLast = ({ slug }: { slug: string }) => PAYMENTS_LAST.some((s) => s === slug)
    expect(payments.map((heading) => heading.textContent)).toEqual(
      [
        ...catalogPayments.filter((e) => !isLast(e)),
        ...catalogPayments.filter(isLast),
      ].map(({ name }) => name)
    )
  })

  it('opens the payments group with a card terminal and ends it with the two other gateways', async () => {
    render(await ExtensionsPage({ params }))
    const names = within(
      screen.getByRole('region', { name: 'Translated payments heading' })
    ).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
    expect(names[0]).toContain('Terminal')
    expect(names.slice(-2)).toEqual(['Email Invoice Gateway', 'WCPOS Vipps MobilePay'])
  })

  it('maps every catalog category to exactly one group', () => {
    for (const { category } of EXTENSIONS) {
      const groups = EXTENSION_GROUPS.filter(({ categories }) =>
        categories.some((groupCategory) => groupCategory === category)
      )
      expect(groups, `category "${category}"`).toHaveLength(1)
    }
  })

  it('shows 12 Pro badges and none on extensions that do not require Pro', async () => {
    render(await ExtensionsPage({ params }))
    expect(screen.getAllByText('Pro')).toHaveLength(12)
    EXPECTED.filter(({ pro }) => !pro).forEach(({ name }) => {
      const item = screen.getByRole('heading', { level: 3, name }).closest('li')
      expect(item).not.toBeNull()
      expect(within(item!).queryByText('Pro')).not.toBeInTheDocument()
    })
  })

  it('emits an ItemList with all 15 extensions', async () => {
    const { container } = render(await ExtensionsPage({ params }))
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const jsonLd = JSON.parse(script!.innerHTML)
    expect(jsonLd['@type']).toBe('ItemList')
    expect(jsonLd.itemListElement).toHaveLength(15)
    expect(jsonLd.itemListElement[0].url).toBe(
      'https://docs.wcpos.com/payment/gateways/email-invoice'
    )
    expect(jsonLd.itemListElement[14].position).toBe(15)
  })

  it('builds metadata from translated strings', async () => {
    const metadata = await generateMetadata({ params })
    expect(metadata.title).toBe('Translated extensions metadata title')
    expect(metadata.description).toBe('Translated extensions metadata description')
  })
})
