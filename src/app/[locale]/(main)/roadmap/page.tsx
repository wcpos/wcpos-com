import { setRequestLocale } from 'next-intl/server'
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return marketingMetadata({
    locale,
    path: '/roadmap',
    title: 'Roadmap',
    description:
      'See what we are building next for WCPOS — upcoming features, milestones, and release progress.',
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
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <main>
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-24">
        <header className="mb-14">
          <Eyebrow size="sm" className="font-mono tracking-[0.25em]">
            Roadmap
          </Eyebrow>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            The release train
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Every stop on the way to a faster, offline-proof WCPOS —
            pulled straight from our GitHub, newest work first.
          </p>
          <BoardLinkChip />
        </header>

        <Suspense fallback={<TimelineSkeleton />}>
          <RoadmapTimelineLoader />
        </Suspense>
      </div>
    </main>
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
