import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { CompareBreadcrumb } from './compare-breadcrumb'

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

const PAGES = {
  'oliver-pos': 'oliver',
  'woocommerce-pos': 'woocommerce',
  square: 'square',
  jovvie: 'jovvie',
  vitepos: 'vitepos',
  'yith-pos': 'yith',
  foosales: 'foosales',
} as const

describe('CompareBreadcrumb', () => {
  it('mirrors the BreadcrumbList: hub link, hidden separator, current page', () => {
    render(
      <CompareBreadcrumb label="Breadcrumb" hubLabel="Compare" current="WCPOS vs FooSales" />
    )

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getByRole('link', { name: 'Compare' })).toHaveAttribute(
      'href',
      '/compare'
    )

    const items = nav.querySelectorAll('li')
    expect(items).toHaveLength(3)
    expect(items[1]).toHaveAttribute('aria-hidden', 'true')
    const last = items[items.length - 1]
    expect(last).toHaveAttribute('aria-current', 'page')
    expect(last).toHaveTextContent('WCPOS vs FooSales')
  })

  it('renders the breadcrumb on every comparison page', () => {
    for (const [dir, key] of Object.entries(PAGES)) {
      const source = readFileSync(
        resolve(process.cwd(), `src/app/[locale]/(main)/compare/${dir}/page.tsx`),
        'utf8'
      )
      expect(source, dir).toContain('<CompareBreadcrumb')
      expect(source, dir).toContain(`current={t('${key}.hero.title')}`)
    }
  })
})
