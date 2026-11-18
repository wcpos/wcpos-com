import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SquareComparePage, { generateMetadata } from './page'

// The page reads ~100 keys; the test asserts structure, so identity-with-
// overrides keeps the mock small (matching the pattern in pro/page.test.tsx).
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => Object.assign((key: string) => {
    const messages: Record<string, string> = {
      'square.metadata.title': 'Translated Square metadata title',
      'square.metadata.description':
        'Translated Square metadata description',
      'square.hero.title': 'Translated Square hero title',
      'square.shortAnswer.wcpos': 'Translated short answer for WCPOS',
      'square.faq.orders.question': 'Translated orders question',
      'square.faq.orders.answer': 'Translated orders answer',
      'square.glance.rows.orders.square':
        'Translated Square orders cell',
      'square.limits.location': 'Translated Square location limit',
    }
    return messages[key] ?? key
  }, { rich: (key: string) => `rich:${key}` })),
  setRequestLocale: vi.fn(),
}))

vi.mock('@/i18n/navigation', () => ({ Link: 'a' }))

vi.mock('@/components/home/cta-section', () => ({
  CtaSection: () => <div data-testid="cta-section" />,
}))

const params = Promise.resolve({ locale: 'en' })

describe('SquareComparePage', () => {
  it('tightens the padding under the hero', async () => {
    render(await SquareComparePage({ params }))
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.closest('section')).toHaveClass('pb-6')
  })

  it('associates every comparison cell with headers', async () => {
    render(await SquareComparePage({ params }))
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
    render(await SquareComparePage({ params }))

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Translated Square hero title',
      })
    ).toBeInTheDocument()
    expect(
      screen.getByText('Translated short answer for WCPOS')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Translated Square orders cell')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Translated Square location limit')
    ).toBeInTheDocument()
    expect(
      screen.getByText('square.squareBetter.hardware')
    ).toBeInTheDocument()
    expect(screen.getAllByRole('table')).toHaveLength(1)
    // 9 glance rows + 1 header row.
    expect(screen.getAllByRole('row')).toHaveLength(10)
    expect(
      screen.queryByText('square.glance.rows.where.label')
    ).toBeNull()
    expect(
      screen.queryByText('square.glance.rows.gateways.label')
    ).toBeNull()
    expect(
      screen.queryByText('square.glance.rows.barcode.label')
    ).toBeNull()
  })

  it('emits FAQPage and BreadcrumbList JSON-LD', async () => {
    const { container } = render(await SquareComparePage({ params }))
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const [faq, breadcrumbs] = JSON.parse(script!.innerHTML)
    expect(faq['@type']).toBe('FAQPage')
    expect(faq.mainEntity).toHaveLength(6)
    expect(faq.mainEntity[0].name).toBe('Translated orders question')
    expect(faq.mainEntity[0].acceptedAnswer.text).toBe('Translated orders answer')
    expect(breadcrumbs['@type']).toBe('BreadcrumbList')
    expect(breadcrumbs.itemListElement[1].item).toBe(
      'https://wcpos.com/compare/square'
    )
  })

  it('renders the Pro-adds paragraph through t.rich so its tags become links', async () => {
    render(await SquareComparePage({ params }))
    expect(screen.getByText('rich:square.pricing.proAdds').tagName).toBe('P')
    expect(screen.queryByText('square.pricing.proAdds')).toBeNull()
  })

  it('builds metadata from translated strings', async () => {
    const metadata = await generateMetadata({ params })
    expect(metadata.title).toBe('Translated Square metadata title')
    expect(metadata.description).toBe(
      'Translated Square metadata description'
    )
  })

  it('closes with the call-to-action band before the facts footer', async () => {
    render(await SquareComparePage({ params }))
    const faq = screen.getByRole('heading', { name: 'square.faq.title' })
    const cta = screen.getByTestId('cta-section')
    const footer = screen.getByText('square.footer.corrections')
    expect(faq.compareDocumentPosition(cta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(cta.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('puts the short answer before the disclosure and the disclosure before the glance table', async () => {
    render(await SquareComparePage({ params }))
    const answer = screen.getByRole('heading', { name: 'square.shortAnswer.title' })
    const disclosure = screen.getByRole('heading', { name: 'disclosure.title' })
    const glance = screen.getByRole('heading', { name: 'square.glance.title' })
    expect(answer.compareDocumentPosition(disclosure) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(disclosure.compareDocumentPosition(glance) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
