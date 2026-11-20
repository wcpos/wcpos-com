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
    expect(screen.getByText('One register, every device.')).toBeInTheDocument()
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

  it('keeps fallback release-note bodies in English while localizing surrounding UI', async () => {
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
    expect(screen.getByText(/Cash drawer support/)).toBeInTheDocument()
    expect(screen.queryByText(/Prise en charge du tiroir-caisse/)).not.toBeInTheDocument()
    expect(
      screen.getByText(/Cash drawer support/).closest('[lang="en"]'),
    ).not.toBeNull()
    expect(container.querySelector('[lang="fr"]')).toBeNull()
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

  it('names more registers and stores in the Pro step in every locale', () => {
    // steps.pro.body at round-22 base 62ac921; guards against an untranslated locale.
    const OLD_PRO_BODY: Record<string, string> = {
      en: 'A licensed plugin that adds terminal payments, refunds and stock control on the same foundation.',
      de: 'Ein lizenziertes Plugin, das auf derselben Grundlage Terminalzahlungen, Erstattungen und Bestandskontrolle ergänzt.',
      es: 'Un plugin con licencia que añade pagos con terminal, reembolsos y control de stock sobre la misma base.',
      fr: 'Un plugin sous licence qui ajoute les paiements par terminal, les remboursements et le contrôle du stock sur la même base.',
      it: 'Un plugin con licenza che aggiunge pagamenti con terminale, rimborsi e controllo dello stock sulla stessa base.',
      ja: '同じ土台に端末決済、返金、在庫管理を追加するライセンス付きプラグインです。',
      ko: '터미널 결제, 환불, 재고 관리를 같은 기반 위에 추가하는 라이선스 플러그인입니다.',
      nl: 'Een gelicentieerde plugin die terminalbetalingen, terugbetalingen en voorraadbeheer toevoegt op dezelfde basis.',
      pt: 'Um plugin licenciado que adiciona pagamentos em terminal, reembolsos e controlo de stock sobre a mesma base.',
      zh: '一个授权插件，在同一基础上添加终端付款、退款和库存控制。',
    }
    const readLocale = (locale: string) =>
      JSON.parse(readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'))
    const en = readLocale('en')
    const enProCardBody = readMessage(en, 'downloads.page.steps.pro', 'cardBody')
    expect(readMessage(en, 'downloads.page.steps.pro', 'body')).toContain('registers')
    expect(enProCardBody).toContain('registers')
    const enProCardTitle = readMessage(en, 'downloads.page.steps.pro', 'cardTitle')
    expect(enProCardTitle).toContain('more registers')
    expect(enProCardTitle).not.toMatch(/\bevery\b|\ball\b|unlimited/i)
    for (const key of [
      'hero.tagline',
      'howItFits.title',
      'page.steps.pro.body',
      'page.steps.pro.cardTitle',
      'page.steps.pro.cardBody',
    ]) {
      expect(readMessage(en, 'downloads', key), `en ${key}`).not.toMatch(/\btill\b/i)
    }
    for (const locale of Object.keys(OLD_PRO_BODY)) {
      const messages = readLocale(locale)
      const body = readMessage(messages, 'downloads.page.steps.pro', 'body')
      expect(body, `${locale} body`).not.toBe(OLD_PRO_BODY[locale])
      if (locale !== 'en') {
        expect(readMessage(messages, 'downloads.page.steps.pro', 'cardBody'), `${locale} cardBody`)
          .not.toBe(enProCardBody)
      }
    }
  })
})
