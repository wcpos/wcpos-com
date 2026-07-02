'use client'

import * as React from 'react'

/**
 * Pointer-reactive dot ring (Stripe-style): ~130 dots drift slowly around a
 * circle; dots near the cursor are gently attracted to it and ease back when
 * it leaves. Canvas + rAF, paused when off-screen (IntersectionObserver) or
 * when the tab is hidden; skipped entirely under prefers-reduced-motion
 * (static ring is drawn once instead).
 */

const DOTS = 170
const SIZE = 520
const RING_RADIUS = 190
const ATTRACT_RADIUS = 130
const ATTRACT_STRENGTH = 0.22
const RETURN_EASE = 0.06

type Dot = {
  angle: number
  radius: number
  speed: number
  size: number
  hue: 'slate' | 'red' | 'purple'
  x: number
  y: number
}

function makeDots(): Dot[] {
  const hues: Dot['hue'][] = ['slate', 'slate', 'slate', 'red', 'purple']
  return Array.from({ length: DOTS }, (_, i) => {
    const angle = (i / DOTS) * Math.PI * 2 + Math.sin(i * 7.3) * 0.12
    const radius = RING_RADIUS + Math.sin(i * 3.7) * 26 + Math.cos(i * 1.9) * 12
    return {
      angle,
      radius,
      speed: 0.0009 + (Math.abs(Math.sin(i * 5.1)) * 0.0012),
      size: 1.1 + Math.abs(Math.sin(i * 2.3)) * 1.5,
      hue: hues[i % hues.length],
      x: 0,
      y: 0,
    }
  })
}

const COLORS: Record<Dot['hue'], string> = {
  slate: 'rgba(100, 116, 139, 0.55)',
  red: 'rgba(43, 108, 176, 0.55)',
  purple: 'rgba(127, 84, 179, 0.55)',
}

export function DotOrbit({ className }: { className?: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = SIZE * dpr
    canvas.height = SIZE * dpr
    context.scale(dpr, dpr)

    const dots = makeDots()
    const center = SIZE / 2
    const pointer = { x: -9999, y: -9999 }
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    function draw(animate: boolean) {
      if (!context) return
      context.clearRect(0, 0, SIZE, SIZE)
      for (const dot of dots) {
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
        if (animate && dist < ATTRACT_RADIUS) {
          const pull = (1 - dist / ATTRACT_RADIUS) * ATTRACT_STRENGTH
          dot.x += dx * pull
          dot.y += dy * pull
        } else {
          dot.x += (targetX - dot.x) * RETURN_EASE
          dot.y += (targetY - dot.y) * RETURN_EASE
        }

        context.beginPath()
        context.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2)
        context.fillStyle = COLORS[dot.hue]
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
      pointer.x = ((event.clientX - rect.left) / rect.width) * SIZE
      pointer.y = ((event.clientY - rect.top) / rect.height) * SIZE
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
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ width: SIZE, height: SIZE }}
      data-testid="dot-orbit"
    />
  )
}
