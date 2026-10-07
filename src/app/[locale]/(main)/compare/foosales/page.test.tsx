import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import FoosalesComparePage, { generateMetadata } from './page'

// The page reads ~100 keys; the test asserts structure, so identity-with-
// overrides keeps the mock small (matching the pattern in pro/page.test.tsx).
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => {
    const messages: Record<string, string> = {
      'foosales.metadata.title': 'Translated FooSales metadata title',
      'foosales.metadata.description':
        'Translated FooSales metadata description',
      'foosales.hero.title': 'Translated FooSales hero title',
      'foosales.shortAnswer.wcpos': 'Translated FooSales short answer for WCPOS',
      'foosales.faq.price.question': 'Translated FooSales price question',
      'foosales.faq.price.answer': 'Translated FooSales price answer',
      'foosales.glance.rows.offline.foosales':
        'Translated FooSales offline cell',
    }
    return messages[key] ?? key
  }),
  setRequestLocale: vi.fn(),
}))

const params = Promise.resolve({ locale: 'en' })

describe('FoosalesComparePage', () => {
  it('associates every comparison cell with headers', async () => {
    render(await FoosalesComparePage({ params }))
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

  it('renders the hero, answer-first block, glance table', async () => {
    render(await FoosalesComparePage({ params }))

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Translated FooSales hero title',
      })
    ).toBeInTheDocument()
    expect(
      screen.getByText('Translated FooSales short answer for WCPOS')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Translated FooSales offline cell')
    ).toBeInTheDocument()
    expect(
      screen.getByText('foosales.foosalesBetter.tapToPay')
    ).toBeInTheDocument()
    expect(screen.getAllByRole('table')).toHaveLength(1)
    // 9 glance rows + 1 header row.
    expect(screen.getAllByRole('row')).toHaveLength(10)
  })

  it('emits FAQPage and BreadcrumbList JSON-LD', async () => {
    const { container } = render(await FoosalesComparePage({ params }))
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const [faq, breadcrumbs] = JSON.parse(script!.innerHTML)
    expect(faq['@type']).toBe('FAQPage')
    expect(faq.mainEntity).toHaveLength(6)
    expect(faq.mainEntity[0].name).toBe('Translated FooSales price question')
    expect(faq.mainEntity[0].acceptedAnswer.text).toBe('Translated FooSales price answer')
    expect(breadcrumbs['@type']).toBe('BreadcrumbList')
    expect(breadcrumbs.itemListElement[1].item).toBe(
      'https://wcpos.com/compare/foosales'
    )
  })

  it('builds metadata from translated strings', async () => {
    const metadata = await generateMetadata({ params })
    expect(metadata.title).toBe('Translated FooSales metadata title')
    expect(metadata.description).toBe(
      'Translated FooSales metadata description'
    )
  })

  it('links every source page', async () => {
    render(await FoosalesComparePage({ params }))

    expect(
      screen.getByRole('heading', { name: 'foosales.sources.title' })
    ).toBeInTheDocument()
    const sourceLinks = screen.getAllByRole('link').filter((link) => {
      const href = link.getAttribute('href') ?? ''
      return ['www.foosales.com', 'help.foosales.com', 'apps.apple.com'].includes(new URL(href).host)
    })
    expect(sourceLinks).toHaveLength(13)
    expect(sourceLinks.map((link) => link.getAttribute('href'))).toEqual([
      'https://www.foosales.com/pricing/',
      'https://help.foosales.com/docs/topics/introduction/pricing/',
      'https://www.foosales.com/product/user-add-on/',
      'https://www.foosales.com/product/device-add-on/',
      'https://help.foosales.com/docs/topics/my-account/canceling-your-plan/',
      'https://help.foosales.com/docs/frequently-asked-questions/pre-sales/does-foosales-process-payments-or-integrate-with-third-party-card-readers/',
      'https://www.foosales.com/features/payments/',
      'https://www.foosales.com/features/platform/',
      'https://help.foosales.com/docs/topics/foosales-ios-and-android-apps/minimum-requirements/',
      'https://www.foosales.com/features/offline-mode/',
      'https://help.foosales.com/docs/topics/offline-mode/',
      'https://help.foosales.com/docs/topics/foosales-roadmap/',
      'https://apps.apple.com/us/app/foosales-for-woocommerce/id1251207715',
    ])
    for (const link of sourceLinks) {
      expect(link).toHaveAttribute('rel', 'nofollow')
      const href = link.getAttribute('href')!
      expect(['www.foosales.com', 'help.foosales.com', 'apps.apple.com']).toContain(new URL(href).host)
    }
  })
})
