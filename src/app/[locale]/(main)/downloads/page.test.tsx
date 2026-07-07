import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

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
  const messages = (await import('../../../../../messages/en.json')).default
  const testOverrides: Record<string, Record<string, string>> = {
    'downloads.page': {
      'steps.plugin.cardTitle': 'Nom localisé du plugin',
      'steps.plugin.wordpressOrgCta': 'Répertoire localisé',
    },
  }

  return {
    setRequestLocale: vi.fn(),
    getTranslations: vi.fn(
      async ({ locale, namespace }: { locale: string; namespace: string }) =>
        (key: string, values?: Record<string, string>) => {
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
  return {
    useTranslations: (namespace: string) => {
      const t = (key: string, values?: Record<string, string>) => {
        let message = readMessage(messages, namespace, key)
        for (const [name, value] of Object.entries(values ?? {})) {
          message = message.replace(`{${name}}`, value)
        }
        return message
      }
      t.rich = (key: string) => readMessage(messages, namespace, key)
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
      screen.getByRole('heading', { level: 1, name: 'One till, every device.' }),
    ).toBeInTheDocument()
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
})
