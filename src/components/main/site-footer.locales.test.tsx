import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { locales, type Locale } from '@/i18n/config'
import en from '../../../messages/en.json'
import fr from '../../../messages/fr.json'
import de from '../../../messages/de.json'
import es from '../../../messages/es.json'
import ja from '../../../messages/ja.json'
import zh from '../../../messages/zh.json'
import pt from '../../../messages/pt.json'
import itMessages from '../../../messages/it.json'
import nl from '../../../messages/nl.json'
import ko from '../../../messages/ko.json'

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

vi.mock('./language-selector', () => ({
  LanguageSelector: () => <div data-testid="language-selector" />,
}))
vi.mock('./theme-toggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}))

import { SiteFooter } from './site-footer'

const messages: Record<Locale, typeof en> = {
  en, fr, de, es, ja, zh, pt, it: itMessages, nl, ko,
}

describe('SiteFooter locales', () => {
  expect(locales).toHaveLength(10)

  it.each(locales)('links Compare in the Product column for %s', (locale) => {
    render(
      <NextIntlClientProvider
        locale={locale}
        messages={messages[locale]}
        onError={(error) => {
          throw error
        }}
      >
        <SiteFooter />
      </NextIntlClientProvider>
    )

    const compareLink = screen.getByRole('link', {
      name: messages[locale].footer.compare,
    })
    const proLink = screen.getByRole('link', {
      name: messages[locale].footer.pro,
    })
    expect(compareLink).toHaveAttribute('href', '/compare')
    expect(compareLink.closest('ul')).not.toBeNull()
    expect(compareLink.closest('ul')).toBe(proLink.closest('ul'))
  })
})
