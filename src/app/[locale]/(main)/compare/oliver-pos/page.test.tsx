import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import OliverComparePage, { generateMetadata } from './page'

// The page reads ~100 keys; the test asserts structure, so identity-with-
// overrides keeps the mock small (matching the pattern in pro/page.test.tsx).
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => {
    const messages: Record<string, string> = {
      'oliver.metadata.title': 'Translated Oliver metadata title',
      'oliver.metadata.description': 'Translated Oliver metadata description',
      'oliver.hero.title': 'Translated Oliver hero title',
      'oliver.shortAnswer.wcpos': 'Translated short answer for WCPOS',
      'oliver.faq.offline.question': 'Translated offline question',
      'oliver.faq.offline.answer': 'Translated offline answer',
      'oliver.glance.rows.freePlan.oliver': 'Translated Oliver free plan cell',
    }
    return messages[key] ?? key
  }),
  setRequestLocale: vi.fn(),
}))

const params = Promise.resolve({ locale: 'en' })

describe('OliverComparePage', () => {
  it('renders the hero, answer-first block, and comparison tables', async () => {
    render(await OliverComparePage({ params }))

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Translated Oliver hero title',
      })
    ).toBeInTheDocument()
    expect(
      screen.getByText('Translated short answer for WCPOS')
    ).toBeInTheDocument()
    // Both comparison tables render with every row.
    expect(
      screen.getByText('Translated Oliver free plan cell')
    ).toBeInTheDocument()
    expect(screen.getAllByRole('table')).toHaveLength(2)
    // 13 glance rows + 5 free-tier rows + 2 header rows.
    expect(screen.getAllByRole('row')).toHaveLength(20)
  })

  it('emits FAQPage and BreadcrumbList JSON-LD', async () => {
    const { container } = render(await OliverComparePage({ params }))
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const [faq, breadcrumbs] = JSON.parse(script!.innerHTML)
    expect(faq['@type']).toBe('FAQPage')
    expect(faq.mainEntity).toHaveLength(6)
    expect(faq.mainEntity[0].name).toBe('Translated offline question')
    expect(faq.mainEntity[0].acceptedAnswer.text).toBe(
      'Translated offline answer'
    )
    expect(breadcrumbs['@type']).toBe('BreadcrumbList')
    expect(breadcrumbs.itemListElement[1].item).toBe(
      'https://wcpos.com/compare/oliver-pos'
    )
  })

  it('builds metadata from translated strings', async () => {
    const metadata = await generateMetadata({ params })
    expect(metadata.title).toBe('Translated Oliver metadata title')
    expect(metadata.description).toBe('Translated Oliver metadata description')
  })
})
