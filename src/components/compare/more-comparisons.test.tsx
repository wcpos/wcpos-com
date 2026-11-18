import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createTranslator } from 'next-intl'
import en from '../../../messages/en.json'
import { COMPARISONS } from '@/lib/compare-pages'
import { MoreComparisons } from './more-comparisons'

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () =>
    createTranslator({ locale: 'en', messages: en, namespace: 'compare' })
  ),
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

const COMPARE_DIR = resolve(__dirname, '../../app/[locale]/(main)/compare')
const DETAIL_DIRS = readdirSync(COMPARE_DIR)
  .filter((name) => statSync(join(COMPARE_DIR, name)).isDirectory())
  .sort()

const hubTitle = (key: string) =>
  en.compare.hub[key as keyof typeof en.compare.hub] as { title: string }

describe('MoreComparisons', () => {
  it('links the other six comparisons under their hub titles', async () => {
    render(await MoreComparisons({ current: '/compare/square' }))

    expect(
      screen.getByRole('heading', { level: 2, name: en.compare.more.title })
    ).toBeInTheDocument()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(6)
    expect(links.map((link) => link.getAttribute('href'))).not.toContain(
      '/compare/square'
    )
    for (const { key, href } of COMPARISONS.filter(
      ({ href }) => href !== '/compare/square'
    )) {
      expect(
        screen.getByRole('link', { name: hubTitle(key).title })
      ).toHaveAttribute('href', href)
    }
  })

  it('lists all seven when current is not a comparison page', async () => {
    render(await MoreComparisons({ current: '/compare/unknown' }))

    expect(screen.getAllByRole('link')).toHaveLength(7)
  })

  it('appears on every detail page with that page as current', () => {
    for (const dir of DETAIL_DIRS) {
      const source = readFileSync(join(COMPARE_DIR, dir, 'page.tsx'), 'utf8')
      expect(source, dir).toContain(
        `<MoreComparisons current="/compare/${dir}"`
      )
    }
  })

  it('COMPARISONS lists exactly the seven detail directories', () => {
    expect(DETAIL_DIRS).toHaveLength(7)
    expect(COMPARISONS.map(({ href }) => href).sort()).toEqual(
      DETAIL_DIRS.map((dir) => `/compare/${dir}`)
    )
  })
})
