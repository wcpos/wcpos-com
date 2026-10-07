import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ComparePage, { generateMetadata } from './page'

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => {
    const messages: Record<string, string> = {
      'hub.metadata.title': 'Translated compare metadata title',
      'hub.metadata.description': 'Translated compare metadata description',
      'hub.hero.title': 'Translated compare hero title',
      'hub.hero.subtitle': 'Translated compare hero subtitle',
      'hub.method.title': 'Translated method title',
      'hub.method.body': 'Translated method body',
      'hub.oliverCard.title': 'Translated Oliver card title',
      'hub.oliverCard.description': 'Translated Oliver card description',
      'hub.oliverCard.cta': 'Translated Oliver card CTA',
      'hub.woocommerceCard.title': 'Translated WooCommerce card title',
      'hub.woocommerceCard.description':
        'Translated WooCommerce card description',
      'hub.woocommerceCard.cta': 'Translated WooCommerce card CTA',
      'hub.squareCard.title': 'Translated Square card title',
      'hub.squareCard.description': 'Translated Square card description',
      'hub.squareCard.cta': 'Translated Square card CTA',
      'hub.jovvieCard.title': 'Translated Jovvie card title',
      'hub.jovvieCard.description': 'Translated Jovvie card description',
      'hub.jovvieCard.cta': 'Translated Jovvie card CTA',
      'hub.viteposCard.title': 'Translated Vitepos card title',
      'hub.viteposCard.description': 'Translated Vitepos card description',
      'hub.viteposCard.cta': 'Translated Vitepos card CTA',
      'hub.foosalesCard.title': 'Translated FooSales card title',
      'hub.foosalesCard.description': 'Translated FooSales card description',
      'hub.foosalesCard.cta': 'Translated FooSales card CTA',
      'hub.moreSoon': 'Translated more soon',
      'disclosure.title': 'Translated disclosure title',
      'disclosure.body': 'Translated disclosure body',
    }
    return messages[key] ?? key
  }),
  setRequestLocale: vi.fn(),
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const params = Promise.resolve({ locale: 'en' })

describe('ComparePage', () => {
  it('renders the hero, disclosure, and all comparison links', async () => {
    render(await ComparePage({ params }))

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Translated compare hero title',
      })
    ).toBeInTheDocument()
    expect(screen.getByText('Translated disclosure body')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Translated Oliver card CTA/ })
    ).toHaveAttribute('href', '/compare/oliver-pos')
    expect(
      screen.getByRole('link', { name: /Translated WooCommerce card CTA/ })
    ).toHaveAttribute('href', '/compare/woocommerce-pos')
    expect(
      screen.getByRole('link', { name: /Translated Square card CTA/ })
    ).toHaveAttribute('href', '/compare/square')
    expect(
      screen.getByRole('link', { name: /Translated Jovvie card CTA/ })
    ).toHaveAttribute('href', '/compare/jovvie')
    expect(
      screen.getByRole('link', { name: /Translated Vitepos card CTA/ })
    ).toHaveAttribute('href', '/compare/vitepos')
    expect(
      screen.getByRole('link', { name: /Translated FooSales card CTA/ })
    ).toHaveAttribute('href', '/compare/foosales')
  })

  it('emits ItemList JSON-LD naming all comparisons', async () => {
    const { container } = render(await ComparePage({ params }))
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const jsonLd = JSON.parse(script!.innerHTML)
    expect(jsonLd['@type']).toBe('ItemList')
    expect(jsonLd.itemListElement).toHaveLength(6)
    expect(jsonLd.itemListElement[0].url).toBe(
      'https://wcpos.com/compare/oliver-pos'
    )
    expect(jsonLd.itemListElement[1].url).toBe(
      'https://wcpos.com/compare/woocommerce-pos'
    )
    expect(jsonLd.itemListElement[1].position).toBe(2)
    expect(jsonLd.itemListElement[2].url).toBe(
      'https://wcpos.com/compare/square'
    )
    expect(jsonLd.itemListElement[2].position).toBe(3)
    expect(jsonLd.itemListElement[3].url).toBe(
      'https://wcpos.com/compare/jovvie'
    )
    expect(jsonLd.itemListElement[3].position).toBe(4)
    expect(jsonLd.itemListElement[4].url).toBe(
      'https://wcpos.com/compare/vitepos'
    )
    expect(jsonLd.itemListElement[4].position).toBe(5)
    expect(jsonLd.itemListElement[5].url).toBe(
      'https://wcpos.com/compare/foosales'
    )
    expect(jsonLd.itemListElement[5].position).toBe(6)
  })

  it('builds metadata from translated strings', async () => {
    const metadata = await generateMetadata({ params })
    expect(metadata.title).toBe('Translated compare metadata title')
    expect(metadata.description).toBe('Translated compare metadata description')
  })
})
