import { describe, expect, it, vi } from 'vitest'
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
      async ({ locale, namespace }: { locale: string; namespace: string }) =>
        (key: string, values?: Record<string, string>) => {
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
      screen.getByRole('heading', { level: 1, name: 'Download WooCommerce POS' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Install the free plugin, then open the register in a browser or an app.')).toBeInTheDocument()
  })

  it('sources plugin card labels from translations', async () => {
    const { default: DownloadsPage } = await import(
      '@/app/[locale]/(main)/downloads/page'
    )

    render(await DownloadsPage({ params: Promise.resolve({ locale: 'fr' }) }))

    expect(screen.getByText('Nom localisé du plugin')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Répertoire localisé' }),
    ).toHaveAttribute('href', 'https://wordpress.org/plugins/woocommerce-pos/')
  })

  it('shows the empty state and no version row when GitHub returns no releases', async () => {
    const { default: DownloadsPage } = await import(
      '@/app/[locale]/(main)/downloads/page'
    )

    render(await DownloadsPage({ params: Promise.resolve({ locale: 'en' }) }))

    expect(screen.getByText('The release list did not load')).toBeInTheDocument()
    expect(
      screen.getByText(
        "GitHub did not answer, so recent release notes can't be shown here. The downloads on this page are not affected.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/^\d+\.\d+\.\d+$/)).not.toBeInTheDocument()
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
    expect(
      screen.getByText(/Cash drawer support/).closest('[lang="en"]'),
    ).not.toBeNull()
    expect(container.querySelector('[lang="fr"]')).toBeNull()
  })

  it('goes from the Pro step heading straight to the card', async () => {
    const { default: DownloadsPage } = await import(
      '@/app/[locale]/(main)/downloads/page'
    )

    render(await DownloadsPage({ params: Promise.resolve({ locale: 'en' }) }))

    expect(screen.getByRole('heading', { name: 'Need more than one register?' })).toBeInTheDocument()
    expect(screen.getByText('WCPOS Pro')).toBeInTheDocument()
    expect(screen.queryByText(/on the same foundation/)).not.toBeInTheDocument()
  })

  it('states the Pro requirements in the Pro card', async () => {
    const { default: DownloadsPage } = await import(
      '@/app/[locale]/(main)/downloads/page'
    )

    render(await DownloadsPage({ params: Promise.resolve({ locale: 'en' }) }))

    const proCard = screen.getByText('WCPOS Pro').parentElement!
    expect(
      within(proCard).getByText('WordPress 5.8+ · WooCommerce 9.0+ · PHP 7.4+'),
    ).toBeInTheDocument()
  })

  it('links macOS 12 users to the 1.11.12 desktop build', async () => {
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

  it('links the Web card to the setup guide before the live demo', async () => {
    const { default: DownloadsPage } = await import(
      '@/app/[locale]/(main)/downloads/page'
    )

    render(await DownloadsPage({ params: Promise.resolve({ locale: 'en' }) }))

    const demo = screen.getByRole('link', { name: 'Open the live demo' })
    const setup = within(demo.parentElement!).getByRole('link', {
      name: 'Set up on your store',
    })
    expect(setup).toHaveAttribute(
      'href',
      'https://docs.wcpos.com/getting-started/installation',
    )
    expect(
      setup.compareDocumentPosition(demo) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('stacks step 2 device links on phone with separators only from sm up', async () => {
    const { default: DownloadsPage } = await import(
      '@/app/[locale]/(main)/downloads/page'
    )

    render(await DownloadsPage({ params: Promise.resolve({ locale: 'en' }) }))

    const step = screen
      .getByRole('heading', { level: 3, name: 'Pick your device' })
      .closest('li')!
    const desktopNames = [
      'macOS (Apple Silicon)',
      'macOS (Intel)',
      'Windows',
      'Linux',
    ]
    const desktopRow = within(step)
      .getByRole('link', { name: desktopNames[0] })
      .closest('span')!.parentElement!
    const webRow = within(step).getByRole('link', {
      name: 'Open the live demo',
    }).parentElement!

    for (const row of [desktopRow, webRow]) {
      expect(row).toHaveClass('flex-col', 'sm:flex-row', 'sm:flex-wrap')
      expect(row).not.toHaveClass('flex-wrap')
    }
    expect(
      within(desktopRow).getAllByRole('link').map((link) => link.textContent),
    ).toEqual(desktopNames)
    expect(
      within(webRow).getAllByRole('link').map((link) => link.textContent),
    ).toEqual(['Set up on your store', 'Open the live demo'])

    const separators = Array.from(step.querySelectorAll('span')).filter(
      (span) => span.textContent === '·',
    )
    expect(separators).toHaveLength(desktopNames.length) // three desktop + one web
    for (const separator of separators) {
      expect(separator).toHaveClass('hidden', 'sm:inline')
      expect(separator).toHaveAttribute('aria-hidden', 'true')
    }
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
      for (const key of ['requirements', 'requirementsWithVersion']) {
        const line = readMessage(messages, 'downloads.page.steps.plugin', key)
        expect(line, `${locale} ${key}`).toContain('WooCommerce 9.0+')
        expect(line, `${locale} ${key}`).not.toContain('WooCommerce 5.3')
      }
    }
  })

  it('states WordPress 5.8+ in the Pro requirements in every locale', () => {
    const locales = ['en', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'nl', 'pt', 'zh']
    for (const locale of locales) {
      const messages = JSON.parse(
        readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'),
      )
      const line = readMessage(messages, 'downloads.page.steps.pro', 'requirements')
      for (const part of ['WordPress 5.8+', 'WooCommerce 9.0+', 'PHP 7.4+']) {
        expect(line, locale).toContain(part)
      }
      expect(line, locale).not.toContain('5.6')
    }
  })

  it('names more registers and stores in the Pro step in every locale', () => {
    const locales = ['en', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'nl', 'pt', 'zh']
    const readLocale = (locale: string) =>
      JSON.parse(readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'))
    const en = readLocale('en')
    const enProCardBody = readMessage(en, 'downloads.page.steps.pro', 'cardBody')
    expect(enProCardBody).toContain('registers')
    const enProCardTitle = readMessage(en, 'downloads.page.steps.pro', 'cardTitle')
    expect(enProCardTitle).toBe('WCPOS Pro')
    const enProTitle = readMessage(en, 'downloads.page.steps.pro', 'title')
    expect(enProTitle).toContain('more than one register')
    expect(enProTitle).not.toMatch(/\bevery\b|\ball\b|unlimited/i)
    for (const key of [
      'hero.tagline',
      'howItFits.title',
      'page.steps.pro.cardTitle',
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
