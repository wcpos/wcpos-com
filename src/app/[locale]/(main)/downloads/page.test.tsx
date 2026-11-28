import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import enMessages from '../../../../../messages/en.json'

function readMessage(messages: Record<string, unknown>, namespace: string, key: string) {
  return `${namespace}.${key}`
    .split('.')
    .reduce<unknown>(
      (value, part) =>
        value && typeof value === 'object'
          ? (value as Record<string, unknown>)[part]
          : undefined,
      messages,
    ) as string
}

vi.mock('next-intl/server', async () => {
  const enMessages = (await import('../../../../../messages/en.json')).default
  const frMessages = (await import('../../../../../messages/fr.json')).default
  const messagesByLocale = {
    en: enMessages,
    fr: frMessages,
  } as const
  let currentLocale: keyof typeof messagesByLocale = 'en'
  const testOverrides: Record<string, Record<string, string>> = {
    'downloads.page': {
      'steps.plugin.cardTitle': 'Nom localisé du plugin',
      'steps.plugin.wordpressOrgCta': 'Répertoire localisé',
    },
  }

  return {
    setRequestLocale: vi.fn((locale: string) => {
      currentLocale = locale as keyof typeof messagesByLocale
    }),
    getMessages: vi.fn(async () => messagesByLocale[currentLocale] ?? enMessages),
    getTranslations: vi.fn(
      async ({ locale, namespace }: { locale: string; namespace: string }) => {
        const t = (key: string, values?: Record<string, string>) => {
          const messages =
            messagesByLocale[locale as keyof typeof messagesByLocale] ??
            enMessages
          let message =
            locale === 'fr' && testOverrides[namespace]?.[key]
              ? testOverrides[namespace][key]
              : readMessage(messages, namespace, key)
          for (const [name, value] of Object.entries(values ?? {})) {
            message = message.replace(`{${name}}`, value)
          }
          return message
        }
        t.rich = (key: string, values: Record<string, (chunks: string) => React.ReactNode> = {}) =>
          t(key).split(/(<\w+>.*?<\/\w+>)/).map((part, index) => {
            const tag = /^<(\w+)>(.*)<\/\1>$/.exec(part)
            return <span key={index}>{tag && values[tag[1]] ? values[tag[1]](tag[2]) : part}</span>
          })
        return t
      },
    ),
  }
})

vi.mock('next-intl', async () => {
  const messages = (await import('../../../../../messages/en.json')).default
  const { Fragment } = await import('react')
  type RichValue = string | ((chunks: React.ReactNode) => React.ReactNode)
  return {
    hasLocale: (locales: readonly string[], locale: string) => locales.includes(locale),
    NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    useTranslations: (namespace: string) => {
      const t = (key: string, values?: Record<string, string>) => {
        let message = readMessage(messages, namespace, key)
        for (const [name, value] of Object.entries(values ?? {})) {
          message = message.replace(`{${name}}`, value)
        }
        return message
      }
      t.rich = (key: string, values?: Record<string, RichValue>) => {
        let message = readMessage(messages, namespace, key)
        for (const [name, value] of Object.entries(values ?? {})) {
          if (typeof value === 'string') message = message.replace(`{${name}}`, value)
        }
        return message.split(/(<\w+>.*?<\/\w+>)/).map((part, index) => {
          const tag = /^<(\w+)>(.*)<\/\1>$/.exec(part)
          const render = tag && values?.[tag[1]]
          return (
            <Fragment key={index}>
              {tag && typeof render === 'function' ? render(tag[2]) : part}
            </Fragment>
          )
        })
      }
      return t
    },
  }
})

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

vi.mock('@/components/analytics/tracked-locale-link', () => ({
  TrackedLocaleLink: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

vi.mock('@/services/core/external/github-client', () => ({
  getReleases: vi.fn(async () => []),
}))

vi.mock('@/services/core/external/versions-client', () => ({
  PRODUCT_LABELS: { desktop: 'desktop', free: 'free' },
  getProductVersions: vi.fn(async () => ({})),
  versionFor: vi.fn(() => '1.2.3'),
}))

describe('DownloadsPage', () => {
  it('renders the tile-selector hero on the default page', async () => {
    const { default: DownloadsPage } = await import(
      '@/app/[locale]/(main)/downloads/page'
    )

    render(await DownloadsPage({ params: Promise.resolve({ locale: 'en' }) }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'Download WCPOS for WooCommerce' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Three steps, about five minutes. Everything on this page is free except Pro.')).toBeInTheDocument()
  })

  it('makes the three install steps the hero, in order', async () => {
    const { default: DownloadsPage } = await import(
      '@/app/[locale]/(main)/downloads/page'
    )

    render(await DownloadsPage({ params: Promise.resolve({ locale: 'en' }) }))

    const steps = screen.getAllByRole('listitem').filter((li) => li.closest('ol'))
    const titles = [
      'Install the free plugin on your WordPress site',
      'Get the register for this device',
      'Add your store and sign in',
    ]
    for (const title of titles) {
      expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument()
    }
    expect(steps.length).toBeGreaterThanOrEqual(3)
    expect(screen.queryByText('Three steps to your first sale')).toBeNull()
    expect(screen.getByText('Plugins').tagName).toBe('KBD')
  })

  it('sources plugin card labels from translations', async () => {
    const { default: DownloadsPage } = await import(
      '@/app/[locale]/(main)/downloads/page'
    )

    render(await DownloadsPage({ params: Promise.resolve({ locale: 'fr' }) }))

    expect(screen.getByText(/^Nom localisé du plugin 1\.2\.3 · /)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Répertoire localisé' }),
    ).toHaveAttribute('href', 'https://wordpress.org/plugins/woocommerce-pos/')
  })

  it('shows the empty state and no version row when GitHub returns no releases', async () => {
    const { default: DownloadsPage } = await import(
      '@/app/[locale]/(main)/downloads/page'
    )

    const { container } = render(
      await DownloadsPage({ params: Promise.resolve({ locale: 'en' }) }),
    )

    expect(screen.getByText('The release list did not load')).toBeInTheDocument()
    expect(
      screen.getByText(
        "Recent release notes aren't available here right now. The downloads on this page are not affected.",
      ),
    ).toBeInTheDocument()
    expect(container.querySelector('details')).toBeNull()
    expect(screen.queryByText('Latest')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Free' })).toHaveAttribute(
      'href',
      'https://github.com/wcpos/woocommerce-pos/releases',
    )
    expect(screen.getByRole('link', { name: 'Desktop' })).toHaveAttribute(
      'href',
      'https://github.com/wcpos/electron/releases',
    )
  })

  it('keeps GitHub release-note bodies in English while localizing surrounding UI', async () => {
    const { getReleases } = await import('@/services/core/external/github-client')
    vi.mocked(getReleases).mockResolvedValueOnce([
      {
        tagName: 'v2.0.5',
        name: '2.0.5',
        body: '- Cash drawer support',
        publishedAt: '2026-11-01T00:00:00.000Z',
        draft: false,
        prerelease: false,
        assets: [],
      },
    ])
    const { default: DownloadsPage } = await import(
      '@/app/[locale]/(main)/downloads/page'
    )

    const { container } = render(
      await DownloadsPage({ params: Promise.resolve({ locale: 'fr' }) }),
    )

    expect(
      screen.getByText(
        'Les notes de version proviennent de GitHub et peuvent s’afficher en anglais.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('2.0.5')).toBeInTheDocument()
    expect(screen.queryByText('La liste des versions n’a pas pu être chargée')).not.toBeInTheDocument()
    for (const node of screen.getAllByText(/Cash drawer support/)) {
      expect(node.closest('[lang="en"]')).not.toBeNull()
    }
    expect(container.querySelector('[lang="fr"]')).toBeNull()
  })

  it('puts versions, requirements and Pro in the rail, with text links only', async () => {
    const { default: DownloadsPage } = await import(
      '@/app/[locale]/(main)/downloads/page'
    )

    render(await DownloadsPage({ params: Promise.resolve({ locale: 'en' }) }))

    const rail = screen.getByRole('complementary')
    const row = (label: string) => within(rail).getByText(label).parentElement!
    expect(row('WordPress')).toHaveTextContent('5.6+ (Pro 5.8+)')
    expect(row('WooCommerce')).toHaveTextContent('9.0+')
    expect(row('Free plugin')).toHaveTextContent('1.2.3')
    expect(
      within(rail).getByRole('heading', { name: 'Need more than one register?' }),
    ).toBeInTheDocument()
    expect(within(rail).getByRole('link', { name: 'View Pro plans' })).toHaveAttribute('href', '/pro')
    expect(
      within(rail).getByRole('link', { name: 'Sign in to download Pro' }),
    ).toHaveAttribute('href', '/account/downloads')
  })

  it('links macOS 12 users to the 1.11.12 desktop build', async () => {
    const platform = vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel')
    onTestFinished(() => platform.mockRestore())
    const { default: DownloadsPage } = await import(
      '@/app/[locale]/(main)/downloads/page'
    )

    render(await DownloadsPage({ params: Promise.resolve({ locale: 'en' }) }))

    expect(screen.getByText(/On macOS 12 Monterey\?/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Apple Silicon' })).toHaveAttribute(
      'href',
      'https://updates.wcpos.com/v1/electron/download/darwin-arm64/v1.11.12',
    )
    expect(screen.getByRole('link', { name: 'Intel' })).toHaveAttribute(
      'href',
      'https://updates.wcpos.com/v1/electron/download/darwin-x64/v1.11.12',
    )
  })

  it('links step 3 to the setup guide before the live demo', async () => {
    const { default: DownloadsPage } = await import(
      '@/app/[locale]/(main)/downloads/page'
    )

    render(await DownloadsPage({ params: Promise.resolve({ locale: 'en' }) }))

    const setup = screen.getByRole('link', { name: 'Read the setup guide' })
    const demo = screen.getByRole('link', { name: 'Try the live demo first' })
    expect(setup).toHaveAttribute('href', 'https://docs.wcpos.com/getting-started/installation')
    expect(demo).toHaveAttribute('href', 'https://demo.wcpos.com/pos')
    expect(
      setup.compareDocumentPosition(demo) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('emits SoftwareApplication JSON-LD with a /downloads downloadUrl', async () => {
    const { default: DownloadsPage } = await import(
      '@/app/[locale]/(main)/downloads/page'
    )

    const { container } = render(
      await DownloadsPage({ params: Promise.resolve({ locale: 'en' }) }),
    )

    const app = Array.from(
      container.querySelectorAll('script[type="application/ld+json"]'),
    )
      .map((script) => JSON.parse(script.textContent ?? '{}'))
      .find((data) => data['@type'] === 'SoftwareApplication')

    expect(app.offers.price).toBe('0')
    expect(app.downloadUrl).toMatch(/\/downloads$/)
    expect(app.url).toBe('https://wcpos.com')
    expect(app.description).toBe(enMessages.downloads.meta.description)
    expect(app.softwareVersion).toBe('1.2.3')
    expect(app.softwareRequirements).toBeTruthy()
  })

  it('leaves softwareVersion out of the JSON-LD when there is no free version', async () => {
    const { versionFor } = await import('@/services/core/external/versions-client')
    vi.mocked(versionFor).mockImplementation((_versions, label) =>
      label === 'free' ? null : '1.2.3',
    )
    try {
      const { default: DownloadsPage } = await import(
        '@/app/[locale]/(main)/downloads/page'
      )

      const { container } = render(
        await DownloadsPage({ params: Promise.resolve({ locale: 'en' }) }),
      )

      const app = Array.from(
        container.querySelectorAll('script[type="application/ld+json"]'),
      )
        .map((script) => JSON.parse(script.textContent ?? '{}'))
        .find((data) => data['@type'] === 'SoftwareApplication')

      expect(app).not.toHaveProperty('softwareVersion')
      expect(app.softwareRequirements).toBeTruthy()
    } finally {
      vi.mocked(versionFor).mockImplementation(() => '1.2.3')
    }
  })

  it('points the SoftwareApplication JSON-LD at the locale on /de', async () => {
    const { default: DownloadsPage } = await import(
      '@/app/[locale]/(main)/downloads/page'
    )

    const { container } = render(
      await DownloadsPage({ params: Promise.resolve({ locale: 'de' }) }),
    )

    const app = Array.from(
      container.querySelectorAll('script[type="application/ld+json"]'),
    )
      .map((script) => JSON.parse(script.textContent ?? '{}'))
      .find((data) => data['@type'] === 'SoftwareApplication')

    expect(app.url).toBe('https://wcpos.com/de')
    expect(app.downloadUrl).toBe('https://wcpos.com/de/downloads')
  })

  it('states WooCommerce 9.0+ in the plugin requirements in every locale', () => {
    const locales = ['en', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'nl', 'pt', 'zh']
    for (const locale of locales) {
      const messages = JSON.parse(
        readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'),
      )
      const line = readMessage(messages, 'downloads.page.steps.plugin', 'requirements')
      expect(line, locale).toContain('WooCommerce 9.0+')
      expect(line, locale).not.toContain('WooCommerce 5.3')
    }
  })

  it('names more registers and stores in the Pro step in every locale', () => {
    const locales = ['en', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'nl', 'pt', 'zh']
    const readLocale = (locale: string) =>
      JSON.parse(readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'))
    const en = readLocale('en')
    const enProCardBody = readMessage(en, 'downloads.page.steps.pro', 'cardBody')
    expect(enProCardBody).toContain('registers')
    const enProTitle = readMessage(en, 'downloads.page.steps.pro', 'title')
    expect(enProTitle).toContain('more than one register')
    expect(enProTitle).not.toMatch(/\bevery\b|\ball\b|unlimited/i)
    for (const key of [
      'hero.tagline',
      'howItFits.title',
      'page.steps.pro.cardBody',
    ]) {
      expect(readMessage(en, 'downloads', key), `en ${key}`).not.toMatch(/\btill\b/i)
    }
    for (const locale of locales) {
      const messages = readLocale(locale)
      expect(readMessage(messages, 'downloads.page.steps.pro', 'body'), `${locale} body`)
        .toBeUndefined()
      if (locale !== 'en') {
        expect(readMessage(messages, 'downloads.page.steps.pro', 'cardBody'), `${locale} cardBody`)
          .not.toBe(enProCardBody)
      }
    }
  })
})
