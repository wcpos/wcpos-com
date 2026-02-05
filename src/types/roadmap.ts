export type RoadmapStatus = 'planned' | 'in_progress' | 'done'

export type RoadmapItemType = 'feature' | 'bug'

export interface RoadmapItem {
  id: string
  title: string
  description: string
  status: RoadmapStatus
  type: RoadmapItemType
  url: string
  subIssueProgress?: { total: number; completed: number }
}

export interface RoadmapMilestone {
  title: string
  description: string | null
  dueOn: string | null
  state: 'open' | 'closed'
  features: RoadmapItem[]
  bugs: RoadmapItem[]
  progress: {
    total: number
    completed: number
  }
}

export interface RoadmapData {
  active: RoadmapMilestone[]
  upcoming: RoadmapMilestone[]
  shipped: RoadmapMilestone[]
}
