import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import ExtensionsPage, { generateMetadata } from './page'

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(
    async () => (key: string, values: Record<string, string>) => {
      const messages: Record<string, string> = {
        'metadata.title': 'Translated extensions metadata title',
        'metadata.description': 'Translated extensions metadata description',
        'hero.title': 'Translated extensions hero title',
        'hero.subtitle': 'Translated extensions hero subtitle',
        proTag: 'Pro',
        englishNotice: 'Translated English content notice',
        allDocsLink: 'Translated all extensions documentation',
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

  it('renders all 15 catalog entries with their documentation in catalog order', async () => {
    render(await ExtensionsPage({ params }))
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items).toHaveLength(15)
    EXPECTED.forEach(({ name, docsUrl }, index) => {
      const card = within(items[index])
      expect(card.getByRole('heading', { level: 2, name })).toBeInTheDocument()
      expect(card.getByRole('link', { name: `Docs for ${name}` })).toHaveAttribute(
        'href', docsUrl
      )
    })
  })

  it('shows 12 Pro badges and none on extensions that do not require Pro', async () => {
    render(await ExtensionsPage({ params }))
    expect(screen.getAllByText('Pro')).toHaveLength(12)
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    EXPECTED.forEach(({ pro }, index) => {
      if (!pro) {
        expect(within(items[index]).queryByText('Pro')).not.toBeInTheDocument()
      }
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
