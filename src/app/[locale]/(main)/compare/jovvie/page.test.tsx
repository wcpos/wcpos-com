import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import JovvieComparePage, { generateMetadata } from './page'

// The page reads ~100 keys; the test asserts structure, so identity-with-
// overrides keeps the mock small (matching the pattern in pro/page.test.tsx).
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => {
    const messages: Record<string, string> = {
      'jovvie.metadata.title': 'Translated Jovvie metadata title',
      'jovvie.metadata.description':
        'Translated Jovvie metadata description',
      'jovvie.hero.title': 'Translated Jovvie hero title',
      'jovvie.shortAnswer.wcpos': 'Translated short answer for WCPOS',
      'jovvie.faq.fees.question': 'Translated fees question',
      'jovvie.faq.fees.answer': 'Translated fees answer',
      'jovvie.glance.rows.fees.jovvie':
        'Translated Jovvie fees cell',
    }
    return messages[key] ?? key
  }),
  setRequestLocale: vi.fn(),
}))

const params = Promise.resolve({ locale: 'en' })

describe('JovvieComparePage', () => {
  it('associates every comparison cell with headers', async () => {
    render(await JovvieComparePage({ params }))
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
    render(await JovvieComparePage({ params }))

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Translated Jovvie hero title',
      })
    ).toBeInTheDocument()
    expect(
      screen.getByText('Translated short answer for WCPOS')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Translated Jovvie fees cell')
    ).toBeInTheDocument()
    expect(
      screen.getByText('jovvie.jovvieBetter.rating')
    ).toBeInTheDocument()
    expect(screen.getAllByRole('table')).toHaveLength(1)
    // 7 glance rows + 1 header row.
    expect(screen.getAllByRole('row')).toHaveLength(8)
  })

  it('emits FAQPage and BreadcrumbList JSON-LD', async () => {
    const { container } = render(await JovvieComparePage({ params }))
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const [faq, breadcrumbs] = JSON.parse(script!.innerHTML)
    expect(faq['@type']).toBe('FAQPage')
    expect(faq.mainEntity).toHaveLength(5)
    expect(faq.mainEntity[0].name).toBe('Translated fees question')
    expect(faq.mainEntity[0].acceptedAnswer.text).toBe('Translated fees answer')
    expect(breadcrumbs['@type']).toBe('BreadcrumbList')
    expect(breadcrumbs.itemListElement[1].item).toBe(
      'https://wcpos.com/compare/jovvie'
    )
  })

  it('builds metadata from translated strings', async () => {
    const metadata = await generateMetadata({ params })
    expect(metadata.title).toBe('Translated Jovvie metadata title')
    expect(metadata.description).toBe(
      'Translated Jovvie metadata description'
    )
  })
})
