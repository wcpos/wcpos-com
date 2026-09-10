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
import { Eyebrow } from '@/components/ui/eyebrow'
import { Skeleton } from '@/components/ui/skeleton'
import type { RoadmapData } from '@/types/roadmap'
import type { Metadata } from 'next'
import { marketingMetadata } from '@/lib/seo'
import { clientMessages } from '@/i18n/client-messages'

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
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ variant?: string; fixture?: string }>
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
        <div className={`mx-auto w-full px-4 py-16 sm:py-24 ${process.env.NODE_ENV !== 'production' ? 'max-w-6xl' : 'max-w-3xl'}`}>
          <header className="mb-14">
            <Eyebrow size="sm" className="font-mono tracking-[0.25em]">
              {t('eyebrow')}
            </Eyebrow>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              {t('title')}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              {t('description')}
            </p>
            <BoardLinkChip />
          </header>

          <Suspense fallback={<TimelineSkeleton />}>
            {process.env.NODE_ENV !== 'production' ? <PrototypeBody searchParams={searchParams} /> : <RoadmapTimelineLoader />}
          </Suspense>
        </div>
      </main>
    </NextIntlClientProvider>
  )
}

async function RoadmapTimelineLoader() {
  let data = await getCachedRoadmapData()

  // Local dev has no GitHub App credentials, so the fetch returns empty;
  // substitute a realistic fixture. Production always renders live data.
  // The substitution is logged so an empty board can't silently masquerade
  // as populated during local QA.
  const isEmpty =
    data.active.length === 0 &&
    data.upcoming.length === 0 &&
    data.shipped.length === 0
  if (isEmpty && process.env.NODE_ENV !== 'production') {
    console.warn(
      '[roadmap] GitHub returned no roadmap data — rendering ROADMAP_DEV_FIXTURE (dev only)',
    )
    data = ROADMAP_DEV_FIXTURE
  }

  return <RoadmapTimeline data={data} />
}

async function PrototypeBody({ searchParams }: { searchParams: Promise<{ variant?: string; fixture?: string }> }) {
  if (process.env.NODE_ENV === 'production') return null
  const query = await searchParams
  const [{ FIXTURE }, { VariantA }, { VariantB }, { VariantC }, { PrototypeSwitcher }] = await Promise.all([
    import('@/components/roadmap/prototype/fixture'),
    import('@/components/roadmap/prototype/variant-a'),
    import('@/components/roadmap/prototype/variant-b'),
    import('@/components/roadmap/prototype/variant-c'),
    import('@/components/roadmap/prototype/switcher'),
  ])
  const variant = query.variant === 'B' || query.variant === 'C' ? query.variant : 'A'
  const releases = query.fixture === 'empty' ? FIXTURE.map(r => r.version === 'v1.12.0' ? { ...r, epics: r.epics.map(e => ({ ...e, summary: null })) } : r) : FIXTURE
  const Variant = { A: VariantA, B: VariantB, C: VariantC }[variant]
  return <><Variant releases={releases} /><PrototypeSwitcher current={variant} /></>
}
