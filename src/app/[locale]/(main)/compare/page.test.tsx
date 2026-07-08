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
  it('renders the hero, disclosure, and the Oliver comparison link', async () => {
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
  })

  it('emits ItemList JSON-LD naming the Oliver comparison', async () => {
    const { container } = render(await ComparePage({ params }))
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const jsonLd = JSON.parse(script!.innerHTML)
    expect(jsonLd['@type']).toBe('ItemList')
    expect(jsonLd.itemListElement[0].url).toBe(
      'https://wcpos.com/compare/oliver-pos'
    )
  })

  it('builds metadata from translated strings', async () => {
    const metadata = await generateMetadata({ params })
    expect(metadata.title).toBe('Translated compare metadata title')
    expect(metadata.description).toBe('Translated compare metadata description')
  })
})
