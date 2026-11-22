import type { RoadmapData, Release } from '@/types/roadmap'

// A passed due date on an unshipped release would read as a promise the page
// cannot keep, so it renders as "no date yet".
export function dropPastDueDates(data: RoadmapData, today: string): RoadmapData {
  const drop = (release: Release): Release =>
    release.dueOn !== null && release.dueOn.slice(0, 10) < today
      ? { ...release, dueOn: null }
      : release
  return {
    now: data.now === null ? null : drop(data.now),
    next: data.next.map(drop),
    later: data.later.map(drop),
    shipped: data.shipped,
  }
}
