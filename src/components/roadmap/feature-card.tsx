import type { RoadmapItem } from '@/types/roadmap'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface FeatureCardProps {
  item: RoadmapItem
}

const statusConfig = {
  planned: { label: 'Planned', variant: 'secondary' as const },
  in_progress: { label: 'In Progress', variant: 'default' as const },
  done: { label: 'Done', variant: 'success' as const },
}

export function FeatureCard({ item }: FeatureCardProps) {
  const status = statusConfig[item.status]

  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
      <Card className="h-full hover:border-primary/50 transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{item.title}</CardTitle>
            <Badge variant={status.variant} className="shrink-0 text-xs">
              {status.label}
            </Badge>
          </div>
          {item.description && (
            <CardDescription className="line-clamp-3">
              {item.description}
            </CardDescription>
          )}
        </CardHeader>
      </Card>
    </a>
  )
}
