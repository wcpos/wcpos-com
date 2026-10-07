import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ViteposComparePage, { generateMetadata } from './page'

// The page reads ~100 keys; the test asserts structure, so identity-with-
// overrides keeps the mock small (matching the pattern in pro/page.test.tsx).
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => {
    const messages: Record<string, string> = {
      'vitepos.metadata.title': 'Translated Vitepos metadata title',
      'vitepos.metadata.description':
        'Translated Vitepos metadata description',
      'vitepos.hero.title': 'Translated Vitepos hero title',
      'vitepos.shortAnswer.wcpos': 'Translated short answer for WCPOS',
      'vitepos.faq.price.question': 'Translated price question',
      'vitepos.faq.price.answer': 'Translated price answer',
      'vitepos.glance.rows.offline.vitepos':
        'Translated Vitepos offline cell',
    }
    return messages[key] ?? key
  }),
  setRequestLocale: vi.fn(),
}))

const params = Promise.resolve({ locale: 'en' })

describe('ViteposComparePage', () => {
  it('associates every comparison cell with headers', async () => {
    render(await ViteposComparePage({ params }))
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
    render(await ViteposComparePage({ params }))

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Translated Vitepos hero title',
      })
    ).toBeInTheDocument()
    expect(
      screen.getByText('Translated short answer for WCPOS')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Translated Vitepos offline cell')
    ).toBeInTheDocument()
    expect(
      screen.getByText('vitepos.viteposBetter.restaurant')
    ).toBeInTheDocument()
    expect(screen.getAllByRole('table')).toHaveLength(1)
    // 9 glance rows + 1 header row.
    expect(screen.getAllByRole('row')).toHaveLength(10)
  })

  it('emits FAQPage and BreadcrumbList JSON-LD', async () => {
    const { container } = render(await ViteposComparePage({ params }))
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const [faq, breadcrumbs] = JSON.parse(script!.innerHTML)
    expect(faq['@type']).toBe('FAQPage')
    expect(faq.mainEntity).toHaveLength(6)
    expect(faq.mainEntity[0].name).toBe('Translated price question')
    expect(faq.mainEntity[0].acceptedAnswer.text).toBe('Translated price answer')
    expect(breadcrumbs['@type']).toBe('BreadcrumbList')
    expect(breadcrumbs.itemListElement[1].item).toBe(
      'https://wcpos.com/compare/vitepos'
    )
  })

  it('builds metadata from translated strings', async () => {
    const metadata = await generateMetadata({ params })
    expect(metadata.title).toBe('Translated Vitepos metadata title')
    expect(metadata.description).toBe(
      'Translated Vitepos metadata description'
    )
  })

  it('links every source page', async () => {
    render(await ViteposComparePage({ params }))

    expect(
      screen.getByRole('heading', { name: 'vitepos.sources.title' })
    ).toBeInTheDocument()
    const sourceLinks = screen.getAllByRole('link').filter((link) => {
      const href = link.getAttribute('href') ?? ''
      return href.startsWith('https://vitepos.com/') || href.startsWith('https://wordpress.org/')
    })
    expect(sourceLinks).toHaveLength(6)
    expect(sourceLinks.map((link) => link.getAttribute('href'))).toEqual([
      'https://vitepos.com/pricing/',
      'https://vitepos.com/',
      'https://vitepos.com/features/',
      'https://vitepos.com/user-app-or-kiosk/',
      'https://vitepos.com/pos-cash-register/',
      'https://wordpress.org/plugins/vitepos-lite/',
    ])
    for (const link of sourceLinks) {
      expect(link).toHaveAttribute('rel', 'nofollow')
      const href = link.getAttribute('href')!
      expect(['vitepos.com', 'wordpress.org']).toContain(new URL(href).host)
    }
  })
})
