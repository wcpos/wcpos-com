import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ReleaseHistory } from '@/components/downloads/release-history'
import { resolveLocale } from '@/i18n/resolve-locale'
import { formatDateForLocale } from '@/lib/date-format'
import { selectPublishedReleases } from '@/lib/published-releases'
import { cleanReleaseNotes } from '@/lib/release-notes'
import { marketingMetadata } from '@/lib/seo'
import { getReleases } from '@/services/core/external/github-client'

// Plugin repository within the wcpos GitHub organization.
const PLUGIN_REPO = 'woocommerce-pos'
// Number of published releases shown on the page.
const CHANGELOG_LIMIT = 10

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const t = await getTranslations({ locale, namespace: 'changelog.meta' })
  return marketingMetadata({
    locale,
    path: '/changelog',
    title: t('title'),
    description: t('description'),
  })
}

export default async function ChangelogPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = resolveLocale((await params).locale)
  setRequestLocale(locale)
  const [t, releaseT, releases] = await Promise.all([
    getTranslations({ locale, namespace: 'changelog.page' }),
    getTranslations({ locale, namespace: 'downloads.releaseHistory' }),
    getReleases(PLUGIN_REPO),
  ])
  const published = selectPublishedReleases(releases, CHANGELOG_LIMIT).map(
    (release, index) => {
      const body = cleanReleaseNotes(release.body, release.tagName)
      return {
        version: release.tagName.replace(/^v/, ''),
        date: formatDateForLocale(release.publishedAt, locale, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        body: body || releaseT('emptyNotes'),
        contentLocale: body ? 'en' : locale,
        latest: index === 0,
      }
    },
  )

  return (
    <main>
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-24">
        <header className="mb-14">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            {t('description')}
          </p>
        </header>
        <ReleaseHistory
          releases={published}
          locale={locale}
          headingLevel={2}
          copy={{
            latest: releaseT('latest'),
            fullHistory: releaseT('fullHistory'),
            plugin: releaseT('plugin'),
            desktop: releaseT('desktop'),
            externalContentNotice: releaseT('externalContentNotice'),
          }}
        />
      </div>
    </main>
  )
}
