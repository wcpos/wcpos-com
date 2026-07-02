'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import type { SpikeBurstPointer } from './spike-burst-scene'

/**
 * SpikeBurst — the kit's flagship 3D piece (ADR 0013): a sphere of thin
 * lines radiating from a center, tips dotted, the whole burst orienting
 * toward the pointer over a slow idle spin. Stripe-homepage energy, wcpos
 * blues.
 *
 * The three/R3F scene is a separate lazy chunk and only mounts once the
 * element comes near the viewport (IntersectionObserver). rAF runs only
 * while on-screen and the tab is visible; prefers-reduced-motion renders a
 * single static frame; DPR is capped at 1.5. If WebGL is unavailable or
 * errors, a static CSS fallback renders instead.
 */

const SpikeBurstScene = dynamic(() => import('./spike-burst-scene'), {
  ssr: false,
  loading: () => null,
})

const FALLBACK_BG =
  'radial-gradient(circle at 50% 50%, #5b8def33 0%, #8ad2ff22 35%, transparent 62%),' +
  'radial-gradient(circle at 62% 38%, #ff9ec81f, transparent 40%),' +
  'radial-gradient(circle at 38% 64%, #ffd76a1a, transparent 40%)'

class SceneErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export type SpikeBurstProps = {
  /** Sizing comes from the parent — give the wrapper a width/height. */
  className?: string
}

export function SpikeBurst({ className }: SpikeBurstProps) {
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const pointer = React.useRef<SpikeBurstPointer>({ x: 0, y: 0 })
  const [near, setNear] = React.useState(false)
  const [onScreen, setOnScreen] = React.useState(false)
  const [hidden, setHidden] = React.useState(false)
  const [reducedMotion, setReducedMotion] = React.useState(false)

  React.useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    setReducedMotion(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )

    // mount the lazy scene a bit before it scrolls in; keep tracking
    // visibility so the frameloop pauses off-screen
    const io = new IntersectionObserver(
      ([entry]) => {
        const intersecting = Boolean(entry?.isIntersecting)
        if (intersecting) setNear(true)
        setOnScreen(intersecting)
      },
      { rootMargin: '25% 0px' }
    )
    io.observe(wrapper)

    const onVisibility = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)

    // window-level so the burst answers the pointer across the whole page,
    // normalized to [-1, 1] against the wrapper's center
    const onPointerMove = (event: PointerEvent) => {
      const rect = wrapper.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const x = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)
      const y = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)
      pointer.current.x = Math.max(-1, Math.min(1, x))
      pointer.current.y = Math.max(-1, Math.min(1, y))
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })

    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pointermove', onPointerMove)
    }
  }, [])

  const frameloop = reducedMotion
    ? 'demand'
    : onScreen && !hidden
      ? 'always'
      : 'never'

  const fallback = (
    <div
      aria-hidden="true"
      className="h-full w-full"
      style={{ background: FALLBACK_BG }}
      data-testid="spike-burst-fallback"
    />
  )

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className={cn('pointer-events-none', className)}
      data-testid="spike-burst"
    >
      {near ? (
        <SceneErrorBoundary fallback={fallback}>
          <SpikeBurstScene
            pointer={pointer}
            animate={!reducedMotion}
            frameloop={frameloop}
          />
        </SceneErrorBoundary>
      ) : null}
    </div>
  )
}
