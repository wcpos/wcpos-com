import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../../../messages/en.json'

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

import { CompareChooseActions } from './choose-actions'

describe('CompareChooseActions', () => {
  it('renders the live demo and download links', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <CompareChooseActions />
      </NextIntlClientProvider>
    )

    const demo = screen.getByRole('link', { name: 'Try Live Demo' })
    expect(demo).toHaveAttribute('href', 'https://demo.wcpos.com/pos')

    const download = screen.getByRole('link', { name: 'Download Free' })
    expect(download.getAttribute('href')).toMatch(/\/downloads$/)
  })
})

const COMPARE_DIR = resolve(process.cwd(), 'src/app/[locale]/(main)/compare')

const SLUGS = [
  'square',
  'foosales',
  'oliver-pos',
  'vitepos',
  'woocommerce-pos',
  'yith-pos',
  'jovvie',
] as const

describe('/compare/* choose section actions', () => {
  it.each(SLUGS)('%s keeps the actions in the WCPOS card and the short answer', (slug) => {
    const source = readFileSync(resolve(COMPARE_DIR, slug, 'page.tsx'), 'utf8')
    expect(source.match(/<CompareChooseActions \/>/g) ?? []).toHaveLength(2)
    expect(source).toMatch(
      /\{key === 'wcpos' && <CompareChooseActions \/>\}/
    )
  })
})
