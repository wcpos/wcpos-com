'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * "Any hardware works": flips a slot between models like a turning card.
 * The card rotates edge-on (0→90°), the model swaps while invisible, then
 * the turn completes from the other side (−90°→0°) with a slight scale dip
 * for weight. Timer only runs while the act is on stage (`active`), the tab
 * is visible, and the user hasn't asked for reduced motion; the animation is
 * transform-only.
 *
 * Phases: rest → out (0→90°) → snap (jump to −90°, no transition) → in
 * (−90°→0°) → rest. The snap needs a committed frame before `in` starts, so
 * it advances on a double rAF.
 */
const FLIP_HALF_MS = 350

type Phase = 'rest' | 'out' | 'snap' | 'in'

export function FlipDevice({
  children,
  intervalMs = 3400,
  offsetMs = 0,
  active = true,
  className,
}: {
  children: React.ReactNode[]
  intervalMs?: number
  offsetMs?: number
  active?: boolean
  className?: string
}) {
  const count = children.length
  const [index, setIndex] = React.useState(0)
  const [phase, setPhase] = React.useState<Phase>('rest')

  // flip scheduler — mirrors the old CyclingDevice guards
  React.useEffect(() => {
    if (!active || count < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const flip = () => {
      if (document.hidden) return
      // never re-enter a flip in progress
      setPhase((current) => (current === 'rest' ? 'out' : current))
    }

    // the first model holds a full beat before its first flip — flipping the
    // moment the act activates would snatch away the model the viewer just
    // scrolled to
    let interval: ReturnType<typeof setInterval> | undefined
    const timeout = setTimeout(() => {
      flip()
      interval = setInterval(flip, intervalMs)
    }, offsetMs + intervalMs)

    return () => {
      clearTimeout(timeout)
      if (interval) clearInterval(interval)
    }
  }, [active, count, intervalMs, offsetMs])

  // phase machine
  React.useEffect(() => {
    if (phase === 'out') {
      const t = setTimeout(() => {
        setIndex((current) => (current + 1) % count)
        setPhase('snap')
      }, FLIP_HALF_MS)
      return () => clearTimeout(t)
    }
    if (phase === 'snap') {
      // double rAF: the −90° must be committed without transition before
      // the turn-in starts, or the card would spin the long way around
      let raf2 = 0
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setPhase('in'))
      })
      return () => {
        cancelAnimationFrame(raf1)
        cancelAnimationFrame(raf2)
      }
    }
    if (phase === 'in') {
      const t = setTimeout(() => setPhase('rest'), FLIP_HALF_MS)
      return () => clearTimeout(t)
    }
  }, [phase, count])

  const rotate = phase === 'out' ? 90 : phase === 'snap' ? -90 : 0
  const scale = phase === 'rest' ? 1 : 0.96

  return (
    <div className={cn('relative', className)} style={{ perspective: 1200 }}>
      <div
        className="[transform-style:preserve-3d] will-change-transform"
        data-flip-phase={phase}
        style={{
          transform: `rotateY(${rotate}deg) scale(${scale})`,
          transition:
            phase === 'snap'
              ? 'none'
              : `transform ${FLIP_HALF_MS}ms ${
                  phase === 'out'
                    ? 'cubic-bezier(0.55, 0, 0.85, 0.4)'
                    : 'cubic-bezier(0.15, 0.6, 0.45, 1)'
                }`,
        }}
      >
        {React.Children.map(children, (child, i) => (
          <div
            className={cn(
              i === 0
                ? 'relative'
                : 'absolute inset-0 flex items-end justify-center',
              i !== index && 'invisible'
            )}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  )
}
