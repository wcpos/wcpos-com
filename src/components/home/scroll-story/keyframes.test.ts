import { describe, expect, it } from 'vitest'

import { ACT_HOLDS } from './act-gravity'
import { K, type Track } from './keyframes'

/** Linear interpolation of a track at progress p, clamped at the ends. */
function at([stops, values]: Track, p: number): number {
  if (p <= stops[0]) return values[0]
  for (let i = 1; i < stops.length; i++) {
    if (p <= stops[i]) {
      const span = stops[i] - stops[i - 1]
      const t = span === 0 ? 1 : (p - stops[i - 1]) / span
      return values[i - 1] + t * (values[i] - values[i - 1])
    }
  }
  return values[values.length - 1]
}

const STEP = 0.0025
const samples = Array.from({ length: Math.round(1 / STEP) + 1 }, (_, i) =>
  Math.min(1, i * STEP)
)
const copies = [K.copy1Opacity, K.copy2Opacity, K.copy3Opacity, K.copy4Opacity]

describe('scroll story copy tracks', () => {
  it('keeps one heading at least half visible at every progress', () => {
    for (const p of samples) {
      const visible = Math.max(...copies.map((track) => at(track, p)))
      expect(visible, `progress ${p}`).toBeGreaterThanOrEqual(0.5)
    }
  })

  it('keeps every consecutive copy swap (1–2, 2–3, 3–4) within 0.01', () => {
    for (let a = 0; a + 1 < copies.length; a++) {
      const both = samples.filter(
        (p) => at(copies[a], p) > 0 && at(copies[a + 1], p) > 0
      )
      const span = both.length ? both[both.length - 1] - both[0] : 0
      expect(span, `copies ${a + 1} and ${a + 2}`).toBeLessThanOrEqual(
        0.01 + 1e-9
      )
    }
  })

  it('never rests two copies above 0.2 for more than 0.01', () => {
    let start: number | null = null
    for (const p of samples) {
      const shown = copies.filter((track) => at(track, p) > 0.2).length
      if (shown >= 2) {
        start ??= p
        expect(p - start, `progress ${p}`).toBeLessThanOrEqual(0.01 + 1e-9)
      } else {
        start = null
      }
    }
  })

  it('shows each act heading fully at its hold', () => {
    expect(at(K.copy1Opacity, 0)).toBe(1)
    expect(at(K.copy2Opacity, ACT_HOLDS[0])).toBe(1)
    expect(at(K.copy3Opacity, ACT_HOLDS[1])).toBe(1)
    expect(at(K.copy4Opacity, ACT_HOLDS[2])).toBe(1)
  })

  it('gives every track explicit stops at 0 and 1', () => {
    for (const [name, [stops]] of Object.entries(K)) {
      expect(stops[0], name).toBe(0)
      expect(stops[stops.length - 1], name).toBe(1)
    }
  })
})
