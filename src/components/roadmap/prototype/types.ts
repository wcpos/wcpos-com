export type EpicState = 'planned' | 'in_progress' | 'done'
export interface Epic {
  title: string
  summary: string | null
  state: EpicState
  progress?: { completed: number; total: number }
  url: string
}
export interface Release {
  version: string
  theme: string
  dueOn: string | null
  why: string
  notInRelease: string[]
  group: 'now' | 'next' | 'later' | 'shipped'
  shippedOn: string | null
  epics: Epic[]
  url: string
}
