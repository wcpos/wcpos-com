import { Suspense } from 'react'
import { cacheLife, cacheTag } from 'next/cache'
import { fetchRoadmapData } from '@/services/core/external/github-roadmap'
import { MilestoneList } from '@/components/roadmap/milestone-list'
import type { RoadmapData } from '@/types/roadmap'

async function getCachedRoadmapData(): Promise<RoadmapData> {
  'use cache'
  cacheLife('roadmap')
  cacheTag('roadmap')
  return fetchRoadmapData()
}

function MilestoneListSkeleton() {
  return (
    <div className="space-y-12">
      {[1, 2].map(i => (
        <div key={i} className="space-y-4">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <div className="h-2 w-full rounded bg-muted animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(j => (
              <div key={j} className="h-32 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function RoadmapPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-3">Roadmap</h1>
        <p className="text-lg text-muted-foreground">
          What we&apos;re building for WooCommerce POS
        </p>
      </div>

      <Suspense fallback={<MilestoneListSkeleton />}>
        <MilestoneListLoader />
      </Suspense>
    </main>
  )
}

async function MilestoneListLoader() {
  const data = await getCachedRoadmapData()
  return <MilestoneList data={data} />
}
