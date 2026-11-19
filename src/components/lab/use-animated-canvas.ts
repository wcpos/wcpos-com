'use client'

import * as React from 'react'

export type Pointer = { x: number; y: number } | null

export type CanvasRenderer = (
  ctx: CanvasRenderingContext2D,
  size: { w: number; h: number },
  t: number,
  pointer: Pointer
) => void

/**
 * Shared engine for the backdrop lab canvases: DPR-capped sizing with
 * ResizeObserver, pointer tracking in canvas coordinates, rAF gated by
 * IntersectionObserver + visibilitychange, and a single static frame under
 * prefers-reduced-motion. Renderers are pure draw functions of (ctx, size,
 * elapsed seconds, pointer).
 */
export function useAnimatedCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  render: CanvasRenderer
) {
  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const size = { w: 0, h: 0 }

    function resize() {
      if (!canvas || !ctx) return
      size.w = canvas.clientWidth
      size.h = canvas.clientHeight
      canvas.width = Math.max(1, Math.round(size.w * dpr))
      canvas.height = Math.max(1, Math.round(size.h * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const resizeObserver = new ResizeObserver(() => {
      resize()
      if (reducedMotion) drawFrame(0)
    })
    resizeObserver.observe(canvas)

    let pointer: Pointer = null
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      pointer =
        x >= 0 && y >= 0 && x <= rect.width && y <= rect.height
          ? { x, y }
          : null
    }
    const onPointerLeave = () => {
      pointer = null
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerleave', onPointerLeave)

    const started = performance.now()
    function drawFrame(t: number) {
      if (!ctx) return
      ctx.clearRect(0, 0, size.w, size.h)
      render(ctx, size, t, pointer)
    }

    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let frame = 0
    let running = false
    const tick = () => {
      drawFrame((performance.now() - started) / 1000)
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

    let io: IntersectionObserver | undefined
    if (reducedMotion) {
      drawFrame(0)
    } else {
      io = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && !document.hidden) start()
        else stop()
      })
      io.observe(canvas)
      document.addEventListener('visibilitychange', onVisibility)
    }
    function onVisibility() {
      if (document.hidden) stop()
      else start()
    }

    return () => {
      stop()
      io?.disconnect()
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [canvasRef, render])
}
