import type { RoadmapMilestone } from '@/types/roadmap'
import { Badge } from '@/components/ui/badge'
import { FeatureCard } from './feature-card'
import { BugFixList } from './bug-fix-list'

interface MilestoneSectionProps {
  milestone: RoadmapMilestone
}

export function MilestoneSection({ milestone }: MilestoneSectionProps) {
  const progressPercent = milestone.progress.total > 0
    ? Math.round((milestone.progress.completed / milestone.progress.total) * 100)
    : 0

  const statusVariant = milestone.state === 'closed' ? 'success' as const : 'secondary' as const

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-2xl font-semibold">{milestone.title}</h3>
        <Badge variant={statusVariant}>
          {milestone.state === 'closed' ? 'Shipped' : `${progressPercent}%`}
        </Badge>
      </div>

      {milestone.description && (
        <p className="text-muted-foreground">{milestone.description}</p>
      )}

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Feature cards */}
      {milestone.features.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {milestone.features.map(feature => (
            <FeatureCard key={feature.id} item={feature} />
          ))}
        </div>
      )}

      {/* Bug fixes (collapsible) */}
      {milestone.bugs.length > 0 && (
        <BugFixList bugs={milestone.bugs} />
      )}
    </div>
  )
}
