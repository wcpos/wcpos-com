import type { RoadmapData } from '@/types/roadmap'
import { MilestoneSection } from './milestone-section'

interface MilestoneListProps {
  data: RoadmapData
}

export function MilestoneList({ data }: MilestoneListProps) {
  const hasContent = data.active.length > 0 || data.upcoming.length > 0 || data.shipped.length > 0

  if (!hasContent) {
    return (
      <p className="text-muted-foreground text-center py-12">
        No roadmap items to display yet.
      </p>
    )
  }

  return (
    <div className="space-y-16">
      {data.active.length > 0 && (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-6">
            In Progress
          </h2>
          <div className="space-y-12">
            {data.active.map(milestone => (
              <MilestoneSection key={milestone.title} milestone={milestone} />
            ))}
          </div>
        </section>
      )}

      {data.upcoming.length > 0 && (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-6">
            Up Next
          </h2>
          <div className="space-y-12">
            {data.upcoming.map(milestone => (
              <MilestoneSection key={milestone.title} milestone={milestone} />
            ))}
          </div>
        </section>
      )}

      {data.shipped.length > 0 && (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-6">
            Recently Shipped
          </h2>
          <div className="space-y-12 opacity-75">
            {data.shipped.map(milestone => (
              <MilestoneSection key={milestone.title} milestone={milestone} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
