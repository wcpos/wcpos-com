import type { RoadmapData, RoadmapMilestone } from '@/types/roadmap'
import { MilestoneSection } from './milestone-section'

interface MilestoneListProps {
  data: RoadmapData
}

interface MilestoneGroup {
  label: string
  milestones: RoadmapMilestone[]
  /** Shipped work is de-emphasised. */
  dim?: boolean
}

export function MilestoneList({ data }: MilestoneListProps) {
  const groups: MilestoneGroup[] = [
    { label: 'In Progress', milestones: data.active },
    { label: 'Up Next', milestones: data.upcoming },
    { label: 'Recently Shipped', milestones: data.shipped, dim: true },
  ]

  const hasContent = groups.some((group) => group.milestones.length > 0)

  if (!hasContent) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        No roadmap items to display yet.
      </p>
    )
  }

  return (
    <div className="space-y-16">
      {groups.map((group) =>
        group.milestones.length > 0 ? (
          <section key={group.label}>
            <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-wcpos-red dark:text-wcpos-red-accent">
              {group.label}
            </h2>
            <div className={group.dim ? 'space-y-12 opacity-75' : 'space-y-12'}>
              {group.milestones.map((milestone) => (
                <MilestoneSection key={milestone.title} milestone={milestone} />
              ))}
            </div>
          </section>
        ) : null,
      )}
    </div>
  )
}
