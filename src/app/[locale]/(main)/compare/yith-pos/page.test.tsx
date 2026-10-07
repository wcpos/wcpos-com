import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import YithComparePage, { generateMetadata } from './page'

// The page reads ~100 keys; the test asserts structure, so identity-with-
// overrides keeps the mock small (matching the pattern in pro/page.test.tsx).
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => {
    const messages: Record<string, string> = {
      'yith.metadata.title': 'Translated YITH metadata title',
      'yith.metadata.description':
        'Translated YITH metadata description',
      'yith.hero.title': 'Translated YITH hero title',
      'yith.shortAnswer.wcpos': 'Translated short answer for WCPOS',
      'yith.faq.price.question': 'Translated price question',
      'yith.faq.price.answer': 'Translated price answer',
      'yith.glance.rows.offline.yith':
        'Translated YITH offline cell',
    }
    return messages[key] ?? key
  }),
  setRequestLocale: vi.fn(),
}))

const params = Promise.resolve({ locale: 'en' })

describe('YithComparePage', () => {
  it('associates every comparison cell with headers', async () => {
    render(await YithComparePage({ params }))
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
    render(await YithComparePage({ params }))

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Translated YITH hero title',
      })
    ).toBeInTheDocument()
    expect(
      screen.getByText('Translated short answer for WCPOS')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Translated YITH offline cell')
    ).toBeInTheDocument()
    expect(
      screen.getByText('yith.yithBetter.stores')
    ).toBeInTheDocument()
    expect(screen.getAllByRole('table')).toHaveLength(1)
    // 9 glance rows + 1 header row.
    expect(screen.getAllByRole('row')).toHaveLength(10)
  })

  it('emits FAQPage and BreadcrumbList JSON-LD', async () => {
    const { container } = render(await YithComparePage({ params }))
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const [faq, breadcrumbs] = JSON.parse(script!.innerHTML)
    expect(faq['@type']).toBe('FAQPage')
    expect(faq.mainEntity).toHaveLength(6)
    expect(faq.mainEntity[0].name).toBe('Translated price question')
    expect(faq.mainEntity[0].acceptedAnswer.text).toBe('Translated price answer')
    expect(breadcrumbs['@type']).toBe('BreadcrumbList')
    expect(breadcrumbs.itemListElement[1].item).toBe(
      'https://wcpos.com/compare/yith-pos'
    )
  })

  it('builds metadata from translated strings', async () => {
    const metadata = await generateMetadata({ params })
    expect(metadata.title).toBe('Translated YITH metadata title')
    expect(metadata.description).toBe(
      'Translated YITH metadata description'
    )
  })

  it('links every source page', async () => {
    render(await YithComparePage({ params }))

    expect(
      screen.getByRole('heading', { name: 'yith.sources.title' })
    ).toBeInTheDocument()
    const sourceLinks = screen.getAllByRole('link').filter((link) => {
      const href = link.getAttribute('href') ?? ''
      return href.startsWith('https://yithemes.com/') || href.startsWith('https://docs.yithemes.com/')
    })
    expect(sourceLinks).toHaveLength(9)
    expect(sourceLinks.map((link) => link.getAttribute('href'))).toEqual([
      'https://yithemes.com/themes/plugins/yith-point-of-sale-for-woocommerce/',
      'https://docs.yithemes.com/yith-point-of-sale-for-woocommerce/faqs/',
      'https://docs.yithemes.com/yith-point-of-sale-for-woocommerce/settings/additional-payment-methods/',
      'https://docs.yithemes.com/yith-point-of-sale-for-woocommerce/pos-screen/mobile-version/',
      'https://docs.yithemes.com/yith-point-of-sale-for-woocommerce/settings/stores/employees/',
      'https://docs.yithemes.com/yith-point-of-sale-for-woocommerce/pos-screen/manage-cash/',
      'https://docs.yithemes.com/yith-point-of-sale-for-woocommerce/pos-screen/close-register/',
      'https://docs.yithemes.com/yith-point-of-sale-for-woocommerce/changelog/',
      'https://yithemes.com/terms-and-conditions/',
    ])
    for (const link of sourceLinks) {
      expect(link).toHaveAttribute('rel', 'nofollow')
      const href = link.getAttribute('href')!
      expect(['yithemes.com', 'docs.yithemes.com']).toContain(new URL(href).host)
    }
  })
})
