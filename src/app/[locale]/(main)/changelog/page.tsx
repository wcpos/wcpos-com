import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { CloudOff } from 'lucide-react'
import { buildReleaseLines } from '@/components/changelog/changelog-releases'
import { ReleaseLines } from '@/components/changelog/release-lines'
import { FullHistoryLinks } from '@/components/downloads/release-history'
import { EmptyState } from '@/components/ui/empty-state'
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
  const lines = buildReleaseLines(
    selectPublishedReleases(releases, CHANGELOG_LIMIT).map((release) => {
      const body = cleanReleaseNotes(release.body.replace(/\r\n/g, '\n'), release.tagName)
      return {
        version: release.tagName.replace(/^v/, ''),
        date: formatDateForLocale(release.publishedAt, locale, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        body: body || releaseT('emptyNotes'),
        contentLocale: body ? 'en' : locale,
      }
    }),
  )
  const history = (
    <FullHistoryLinks
      external
      className="text-sm text-muted-foreground"
      copy={{ fullHistory: t('history'), plugin: t('plugin'), desktop: t('desktop') }}
    />
  )

  return (
    <main>
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-24">
        <header className="mb-9 max-w-3xl lg:mb-12">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            {t('description')}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {locale.startsWith('en') ? t('notesSource') : releaseT('externalContentNotice')}
          </p>
        </header>
        {lines.length === 0 ? (
          <EmptyState icon={<CloudOff />} title={t('unavailable')} action={history} />
        ) : (
          <>
            <ReleaseLines lines={lines} t={t} locale={locale} latest={releaseT('latest')} />
            <div className="mt-8 text-center">{history}</div>
          </>
        )}
      </div>
    </main>
  )
}
