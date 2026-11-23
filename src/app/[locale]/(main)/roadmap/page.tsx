import { NextIntlClientProvider } from 'next-intl'
import { resolveLocale } from '@/i18n/resolve-locale'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { cacheLife, cacheTag } from 'next/cache'
import { fetchRoadmapData } from '@/services/core/external/github-roadmap'
import {
  RoadmapTimeline,
  BoardLinkChip,
} from '@/components/roadmap/roadmap-timeline'
import { ROADMAP_DEV_FIXTURE } from '@/components/roadmap/dev-fixture'
import { dropPastDueDates } from '@/components/roadmap/past-due'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Skeleton } from '@/components/ui/skeleton'
import type { RoadmapData } from '@/types/roadmap'
import type { Metadata } from 'next'
import { marketingMetadata } from '@/lib/seo'
import { clientMessages } from '@/i18n/client-messages'
import { Link } from '@/i18n/navigation'
import { TextLink } from '@/components/ui/text-link'
import { CtaSection } from '@/components/home/cta-section'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const t = await getTranslations({ locale, namespace: 'roadmap.meta' })
  return marketingMetadata({
    locale,
    path: '/roadmap',
    title: t('title'),
    description: t('description'),
  })
}

async function getCachedRoadmapData(): Promise<RoadmapData> {
  'use cache'
  cacheLife('roadmap')
  cacheTag('roadmap')
  return fetchRoadmapData()
}

// Today's UTC date, cached on the roadmap cache life so it is never older than that life's two-hour expiry, kept out of the tag-cached fetch.
async function getRoadmapToday(): Promise<string> {
  'use cache'
  cacheLife('roadmap')
  return new Date().toISOString().slice(0, 10)
}

function TimelineSkeleton() {
  return (
    <div className="space-y-10 border-l-2 pl-8 sm:pl-10">
      {[1, 2].map((i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-1 w-full max-w-xs" />
          <Skeleton className="h-5 w-full max-w-xl" />
          {[1, 2, 3].map((j) => (
            <Skeleton key={j} className="h-14 w-full" />
          ))}
        </div>
      ))}
    </div>
  )
}

export default async function RoadmapPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = resolveLocale((await params).locale)
  setRequestLocale(locale)
  const [messages, t] = await Promise.all([
    getMessages(),
    getTranslations({ locale, namespace: 'roadmap.page' }),
  ])

  return (
    <NextIntlClientProvider messages={clientMessages(messages, ['roadmap'])}>
      <main>
        <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-24">
          <header className="mb-14">
            <Eyebrow size="sm" className="font-mono tracking-[0.25em]">
              {t('eyebrow')}
            </Eyebrow>
            <h1 className="mt-3 text-4xl font-bold tracking-tight break-words hyphens-auto sm:text-5xl">
              {t('title')}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              {t('description')}
            </p>
            <BoardLinkChip />
            <p className="mt-4 text-sm">
              <TextLink asChild>
                <Link href="/changelog">{t('changelogLink')}</Link>
              </TextLink>
            </p>
          </header>

          <Suspense fallback={<TimelineSkeleton />}>
            <RoadmapTimelineLoader />
          </Suspense>
        </div>
        <CtaSection />
      </main>
    </NextIntlClientProvider>
  )
}

async function RoadmapTimelineLoader() {
  let data = await getCachedRoadmapData()

  // Local dev has no GitHub App credentials, so the fetch returns empty;
  // substitute a realistic fixture. Production always renders live data.
  // The substitution is logged so an empty roadmap can't silently masquerade
  // as populated during local QA.
  const isEmpty =
    data.now === null &&
    data.next.length === 0 &&
    data.later.length === 0 &&
    data.shipped.length === 0
  if (isEmpty && process.env.NODE_ENV !== 'production') {
    console.warn(
      '[roadmap] GitHub returned no roadmap data — rendering ROADMAP_DEV_FIXTURE (dev only)',
    )
    data = ROADMAP_DEV_FIXTURE
  }

  data = dropPastDueDates(data, await getRoadmapToday())

  return <RoadmapTimeline data={data} />
}
