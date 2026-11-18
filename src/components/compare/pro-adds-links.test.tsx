import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createTranslator } from 'next-intl'
import en from '../../../messages/en.json'
import de from '../../../messages/de.json'
import nl from '../../../messages/nl.json'
import fr from '../../../messages/fr.json'
import es from '../../../messages/es.json'
import it_ from '../../../messages/it.json'
import pt from '../../../messages/pt.json'
import ja from '../../../messages/ja.json'
import ko from '../../../messages/ko.json'
import zh from '../../../messages/zh.json'
import { proAddsLinks } from './pro-adds-links'

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

const LOCALES = { en, de, nl, fr, es, it: it_, pt, ja, ko, zh }
const PAGES = [
  'vitepos',
  'oliver',
  'foosales',
  'square',
  'woocommerce',
  'yith',
  'jovvie',
] as const

const cases = Object.entries(LOCALES).flatMap(([locale, messages]) =>
  PAGES.map((page) => [locale, page, messages.compare[page].pricing.proAdds] as const)
)

describe('compare proAdds strings', () => {
  it.each(cases)('%s compare.%s.pricing.proAdds has one <pro> and one <ext>', (_locale, _page, message) => {
    expect(message.match(/<pro>[^<]+<\/pro>/g)).toHaveLength(1)
    expect(message.match(/<ext>[^<]+<\/ext>/g)).toHaveLength(1)
    const stripped = message.replace(/<(pro|ext)>([^<]+)<\/\1>/g, '$2')
    expect(stripped.trim()).not.toBe('')
    expect(stripped).not.toContain('<')
  })
})

describe('proAddsLinks', () => {
  it('links "Pro" to /pro and "extension directory" to /extensions', () => {
    const t = createTranslator({ locale: 'en', messages: en, namespace: 'compare' })
    render(<p>{t.rich('square.pricing.proAdds', proAddsLinks)}</p>)

    expect(screen.getByRole('link', { name: 'Pro' })).toHaveAttribute('href', '/pro')
    expect(
      screen.getByRole('link', { name: 'extension directory' })
    ).toHaveAttribute('href', '/extensions')
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })
})
