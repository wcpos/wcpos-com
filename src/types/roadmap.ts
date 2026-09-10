export type EpicState = 'planned' | 'in_progress' | 'done'

export interface Epic {
  number: number
  title: string
  summary: string
  pitch: string
  state: EpicState
  progress?: { completed: number; total: number }
  url: string
}

export interface Release {
  version: string
  major: number
  minor: number
  theme: string
  dueOn: string | null
  why: string
  pitch: string
  notInRelease: string
  prose: string
  url: string
  epics: Epic[]
  hiddenEpicCount: number
  shippedOn: string | null
}

export interface RoadmapData {
  now: Release | null
  next: Release[]
  later: Release[]
  shipped: Release[]
}
