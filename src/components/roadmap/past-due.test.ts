import { describe, it, expect } from 'vitest'
import { dropPastDueDates } from './past-due'
import type { RoadmapData, Release } from '@/types/roadmap'

const today = '2026-11-22'
const release: Release = {
  version: 'v1.11.0', major: 1, minor: 11, theme: 'Checkout & payments',
  dueOn: '2026-10-01T00:00:00Z', why: '**Faster checkout**',
  pitch: 'Keep checkout moving.', notInRelease: '- Fiscal compliance',
  prose: 'Public context', url: 'https://github.com/wcpos/roadmap/issues/11',
  hiddenEpicCount: 3, shippedOn: null,
  epics: [],
}
const withDue = (dueOn: string | null): Release => ({ ...release, dueOn })

describe('dropPastDueDates', () => {
  it('drops a due date before today on now, next and later releases', () => {
    const data: RoadmapData = {
      now: withDue('2026-11-21'),
      next: [withDue('2026-09-18')],
      later: [withDue('2025-01-01')],
      shipped: [],
    }
    const result = dropPastDueDates(data, today)
    expect(result.now?.dueOn).toBeNull()
    expect(result.next.map((r) => r.dueOn)).toEqual([null])
    expect(result.later.map((r) => r.dueOn)).toEqual([null])
  })

  it('keeps a due date of today and a future due date', () => {
    const data: RoadmapData = {
      now: withDue('2026-11-22'),
      next: [withDue('2026-11-23'), withDue('2026-11-22')],
      later: [withDue('2027-03-01')],
      shipped: [],
    }
    const result = dropPastDueDates(data, today)
    expect(result.now?.dueOn).toBe('2026-11-22')
    expect(result.next.map((r) => r.dueOn)).toEqual(['2026-11-23', '2026-11-22'])
    expect(result.later.map((r) => r.dueOn)).toEqual(['2027-03-01'])
  })

  it('handles the ISO timestamp form of dueOn', () => {
    const data: RoadmapData = {
      now: withDue('2026-10-01T00:00:00Z'),
      next: [withDue('2026-12-31T00:00:00Z')],
      later: [withDue('2026-11-22T00:00:00Z')],
      shipped: [],
    }
    const result = dropPastDueDates(data, today)
    expect(result.now?.dueOn).toBeNull()
    expect(result.next.map((r) => r.dueOn)).toEqual(['2026-12-31T00:00:00Z'])
    expect(result.later.map((r) => r.dueOn)).toEqual(['2026-11-22T00:00:00Z'])
  })

  it('leaves shipped releases and null due dates unchanged', () => {
    const shipped = [{ ...withDue('2026-01-01'), shippedOn: '2026-01-02' }]
    const data: RoadmapData = {
      now: withDue(null),
      next: [withDue(null)],
      later: [],
      shipped,
    }
    const result = dropPastDueDates(data, today)
    expect(result.now?.dueOn).toBeNull()
    expect(result.next.map((r) => r.dueOn)).toEqual([null])
    expect(result.shipped).toBe(shipped)
    expect(result.shipped[0].dueOn).toBe('2026-01-01')
    expect(dropPastDueDates({ ...data, now: null }, today).now).toBeNull()
  })

  it('does not mutate its input', () => {
    const data: RoadmapData = {
      now: withDue('2026-09-18'),
      next: [withDue('2026-10-01'), withDue('2026-12-01')],
      later: [withDue('2026-01-01')],
      shipped: [],
    }
    const snapshot = structuredClone(data)
    const result = dropPastDueDates(data, today)
    expect(data).toEqual(snapshot)
    expect(result).not.toBe(data)
    expect(result.next).toHaveLength(2)
    expect(result.next[1].dueOn).toBe('2026-12-01')
  })
})
