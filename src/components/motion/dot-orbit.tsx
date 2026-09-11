'use client'

import * as React from 'react'

/**
 * Pointer-reactive dot ring (Stripe-style): dots drift slowly around a
 * circle; dots near the cursor are gently attracted to it and ease back when
 * it leaves. Canvas + rAF, paused when off-screen (IntersectionObserver) or
 * when the tab is hidden; skipped entirely under prefers-reduced-motion
 * (static ring is drawn once instead).
 *
 * Generalized from the homepage scroll-story act 4: dot count, canvas size,
 * ring radius and palette are configurable; defaults reproduce the homepage
 * ring exactly.
 */

const ATTRACT_STRENGTH = 0.22
const RETURN_EASE = 0.06

// Homepage defaults: mostly slate with brand red/purple accents (weighted
// by repetition — dot i takes palette[i % palette.length]).
const DEFAULT_PALETTE = [
  'rgba(100, 116, 139, 0.55)',
  'rgba(100, 116, 139, 0.55)',
  'rgba(100, 116, 139, 0.55)',
  'rgba(205, 32, 31, 0.5)',
  'rgba(127, 84, 179, 0.55)',
]

type Dot = {
  angle: number
  radius: number
  speed: number
  size: number
  color: string
  x: number
  y: number
}

function makeDots(count: number, ringRadius: number, palette: string[]): Dot[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.sin(i * 7.3) * 0.12
    const radius = ringRadius + Math.sin(i * 3.7) * 26 + Math.cos(i * 1.9) * 12
    return {
      angle,
      radius,
      speed: 0.0009 + Math.abs(Math.sin(i * 5.1)) * 0.0012,
      size: 1.1 + Math.abs(Math.sin(i * 2.3)) * 1.5,
      color: palette[i % palette.length],
      x: 0,
      y: 0,
    }
  })
}

export type DotOrbitProps = {
  className?: string
  /** Number of dots on the ring. */
  dots?: number
  /** Logical canvas size in CSS pixels (square). */
  size?: number
  /** Base ring radius; dots scatter ±~38px around it. */
  ringRadius?: number
  /**
   * Dot colors, assigned round-robin — repeat a color to weight it
   * (e.g. three slate entries + one accent ≈ 3:1 mix).
   */
  palette?: string[]
}

export function DotOrbit({
  className,
  dots = 130,
  size = 520,
  ringRadius = 190,
  palette = DEFAULT_PALETTE,
}: DotOrbitProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const attractRadius = size / 4
  // stable key so a new array literal with the same colors does not reset
  // the ring on every parent render
  const paletteKey = palette.join('|')

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size * dpr
    canvas.height = size * dpr
    context.scale(dpr, dpr)

    const ring = makeDots(dots, ringRadius, palette)
    const center = size / 2
    const pointer = { x: -9999, y: -9999 }
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    function draw(animate: boolean) {
      if (!context) return
      context.clearRect(0, 0, size, size)
      for (const dot of ring) {
        if (animate) dot.angle += dot.speed
        const targetX = center + Math.cos(dot.angle) * dot.radius
        const targetY = center + Math.sin(dot.angle) * dot.radius * 0.86

        if (dot.x === 0 && dot.y === 0) {
          dot.x = targetX
          dot.y = targetY
        }

        const dx = pointer.x - dot.x
        const dy = pointer.y - dot.y
        const dist = Math.hypot(dx, dy)
        if (animate && dist < attractRadius) {
          const pull = (1 - dist / attractRadius) * ATTRACT_STRENGTH
          dot.x += dx * pull
          dot.y += dy * pull
        } else {
          dot.x += (targetX - dot.x) * RETURN_EASE
          dot.y += (targetY - dot.y) * RETURN_EASE
        }

        context.beginPath()
        context.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2)
        context.fillStyle = dot.color
        context.fill()
      }
    }

    if (reducedMotion) {
      draw(false)
      return
    }

    let frame = 0
    let running = false
    const tick = () => {
      draw(true)
      frame = requestAnimationFrame(tick)
    }
    const start = () => {
      if (!running) {
        running = true
        frame = requestAnimationFrame(tick)
      }
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(frame)
    }

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !document.hidden) start()
      else stop()
    })
    io.observe(canvas)

    const onVisibility = () => {
      if (document.hidden) stop()
      else start()
    }
    document.addEventListener('visibilitychange', onVisibility)

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      // rect is post-transform; map back into the canvas's logical square
      pointer.x = ((event.clientX - rect.left) / rect.width) * size
      pointer.y = ((event.clientY - rect.top) / rect.height) * size
    }
    const onPointerLeave = () => {
      pointer.x = -9999
      pointer.y = -9999
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerleave', onPointerLeave)

    return () => {
      stop()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dots, size, ringRadius, paletteKey])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ width: size, height: size }}
      data-testid="dot-orbit"
    />
  )
}
