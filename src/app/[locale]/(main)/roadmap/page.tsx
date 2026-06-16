import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { cacheLife, cacheTag } from 'next/cache'
import { fetchRoadmapData } from '@/services/core/external/github-roadmap'
import { MilestoneList } from '@/components/roadmap/milestone-list'
import { Section, Container } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
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
      'See what we are building next for WooCommerce POS — upcoming features, milestones, and release progress.',
  })
}

async function getCachedRoadmapData(): Promise<RoadmapData> {
  'use cache'
  cacheLife('roadmap')
  cacheTag('roadmap')
  return fetchRoadmapData()
}

function MilestoneListSkeleton() {
  return (
    <div className="space-y-12">
      {[1, 2].map((i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-2 w-full" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((j) => (
              <Skeleton key={j} className="h-32 rounded-md" />
            ))}
          </div>
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
      <Section
        tone="none"
        spacing="hero"
        className="bg-gradient-to-b from-muted/40 to-background"
        containerClassName="text-center"
      >
        <SectionHeading
          as="h1"
          size="hero"
          eyebrow="Roadmap"
          title="What we're building for WooCommerce POS"
          subtitle="Upcoming features, milestones, and release progress — pulled straight from our GitHub."
        />
      </Section>

      <Section spacing="default" bare>
        <Container width="content">
          <Suspense fallback={<MilestoneListSkeleton />}>
            <MilestoneListLoader />
          </Suspense>
        </Container>
      </Section>
    </main>
  )
}

async function MilestoneListLoader() {
  const data = await getCachedRoadmapData()
  return <MilestoneList data={data} />
}
