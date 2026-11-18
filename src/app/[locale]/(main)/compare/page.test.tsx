import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ComparePage, { generateMetadata } from './page'
import de from '../../../../../messages/de.json'
import en from '../../../../../messages/en.json'
import es from '../../../../../messages/es.json'
import fr from '../../../../../messages/fr.json'
import it_ from '../../../../../messages/it.json'
import ja from '../../../../../messages/ja.json'
import ko from '../../../../../messages/ko.json'
import nl from '../../../../../messages/nl.json'
import pt from '../../../../../messages/pt.json'
import zh from '../../../../../messages/zh.json'

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
      'hub.yithCard.title': 'Translated YITH card title',
      'hub.yithCard.description': 'Translated YITH card description',
      'hub.yithCard.cta': 'Translated YITH card CTA',
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

const CARDS = [
  { title: 'Translated Square card title', href: '/compare/square' },
  { title: 'Translated FooSales card title', href: '/compare/foosales' },
  { title: 'Translated Oliver card title', href: '/compare/oliver-pos' },
  {
    title: 'Translated WooCommerce card title',
    href: '/compare/woocommerce-pos',
  },
  { title: 'Translated Jovvie card title', href: '/compare/jovvie' },
  { title: 'Translated Vitepos card title', href: '/compare/vitepos' },
  { title: 'Translated YITH card title', href: '/compare/yith-pos' },
]

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
    for (const { title, href } of CARDS) {
      expect(screen.getByRole('link', { name: title })).toHaveAttribute(
        'href',
        href
      )
    }
    expect(screen.queryAllByRole('link', { name: /card CTA/ })).toHaveLength(0)
  })

  it('lists the cards in the order the hub lead names them', async () => {
    render(await ComparePage({ params }))

    const cardLinks = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.querySelector('a')?.getAttribute('href'))
      .filter(Boolean)
    expect(cardLinks.slice(0, 2)).toEqual([
      '/compare/square',
      '/compare/foosales',
    ])
    expect(cardLinks).toEqual(CARDS.map(({ href }) => href))
  })

  it('links each card title to its comparison', async () => {
    render(await ComparePage({ params }))

    for (const { title, href } of CARDS) {
      const heading = screen.getByRole('heading', { level: 2, name: title })
      expect(heading.querySelector(`a[href="${href}"]`)).not.toBeNull()
    }
    const cta = screen
      .getByText('Translated Square card CTA')
      .closest('[aria-hidden="true"]')
    expect(cta).not.toBeNull()
    expect(cta).toHaveAttribute('tabindex', '-1')
  })

  it('puts the comparison cards before the disclosure card', async () => {
    render(await ComparePage({ params }))

    const headings = screen
      .getAllByRole('heading')
      .map((heading) => heading.textContent)
    const lastCard = headings.indexOf('Translated YITH card title')
    const disclosure = headings.indexOf('Translated disclosure title')
    const method = headings.indexOf('Translated method title')
    expect(lastCard).toBeGreaterThan(-1)
    expect(disclosure).toBeGreaterThan(lastCard)
    expect(method).toBeGreaterThan(disclosure)
  })

  it('emits ItemList JSON-LD naming all comparisons', async () => {
    const { container } = render(await ComparePage({ params }))
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const jsonLd = JSON.parse(script!.innerHTML)
    expect(jsonLd['@type']).toBe('ItemList')
    expect(jsonLd.itemListElement).toHaveLength(7)
    expect(jsonLd.itemListElement[0].url).toBe(
      'https://wcpos.com/compare/square'
    )
    expect(jsonLd.itemListElement[1].url).toBe(
      'https://wcpos.com/compare/foosales'
    )
    expect(jsonLd.itemListElement[1].position).toBe(2)
    expect(jsonLd.itemListElement[2].url).toBe(
      'https://wcpos.com/compare/oliver-pos'
    )
    expect(jsonLd.itemListElement[2].position).toBe(3)
    expect(jsonLd.itemListElement[3].url).toBe(
      'https://wcpos.com/compare/woocommerce-pos'
    )
    expect(jsonLd.itemListElement[3].position).toBe(4)
    expect(jsonLd.itemListElement[4].url).toBe(
      'https://wcpos.com/compare/jovvie'
    )
    expect(jsonLd.itemListElement[4].position).toBe(5)
    expect(jsonLd.itemListElement[5].url).toBe(
      'https://wcpos.com/compare/vitepos'
    )
    expect(jsonLd.itemListElement[5].position).toBe(6)
    expect(jsonLd.itemListElement[6].url).toBe(
      'https://wcpos.com/compare/yith-pos'
    )
    expect(jsonLd.itemListElement[6].position).toBe(7)
  })

  it('builds metadata from translated strings', async () => {
    const metadata = await generateMetadata({ params })
    expect(metadata.title).toBe('Translated compare metadata title')
    expect(metadata.description).toBe('Translated compare metadata description')
  })
})

const LOCALE_MESSAGES = { en, de, nl, fr, es, it: it_, pt, ja, ko, zh }

describe('compare.hub.hero.subtitle', () => {
  it.each(Object.entries(LOCALE_MESSAGES))(
    '%s names the comparisons in at most 160 code points',
    (_locale, messages) => {
      const subtitle = messages.compare.hub.hero.subtitle
      expect(subtitle).toContain('Square')
      expect(subtitle).toContain('FooSales')
      expect(subtitle).toContain('WCPOS')
      expect([...subtitle].length).toBeLessThanOrEqual(160)
    }
  )
})
