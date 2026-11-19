'use client'

import * as React from 'react'
import {
  useAnimatedCanvas,
  type CanvasRenderer,
} from './use-animated-canvas'

/**
 * Backdrop lab candidates (crisp / technological, per owner direction).
 * All: calm blue palette with sparse pink/yellow sparks, white page behind,
 * pointer-reactive, IO/visibility gated, reduced-motion static (via the
 * shared engine). Chosen one graduates to the motion kit.
 */

const BLUE_DEEP = '#2b6cb0'
const BLUE = '#5b8def'
const PINK = '#ff9ec8'
const YELLOW = '#f0b429'

function Canvas({ render }: { render: CanvasRenderer }) {
  const ref = React.useRef<HTMLCanvasElement>(null)
  useAnimatedCanvas(ref, render)
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  )
}

/* ------------------------------------------------------------------ */
/* A · Network field — drifting constellation, cursor joins the graph  */
/* ------------------------------------------------------------------ */

type Node = { x: number; y: number; vx: number; vy: number }

function createNetworkRenderer(): CanvasRenderer {
  {
    let nodes: Node[] = []
    let sizedFor = ''
    let lastT = 0
    return (ctx, size, t, pointer) => {
      const key = `${size.w}x${size.h}`
      if (key !== sizedFor) {
        sizedFor = key
        const count = Math.min(150, Math.round((size.w * size.h) / 14000))
        nodes = Array.from({ length: count }, (_, i) => ({
          x: (Math.sin(i * 12.9898) * 0.5 + 0.5) * size.w,
          y: (Math.sin(i * 78.233) * 0.5 + 0.5) * size.h,
          vx: Math.sin(i * 3.7) * 14,
          vy: Math.cos(i * 5.1) * 14,
        }))
      }
      const dt = Math.min(0.05, Math.max(0.001, t - lastT))
      lastT = t
      const LINK = 130
      for (const n of nodes) {
        n.x += n.vx * dt
        n.y += n.vy * dt
        if (n.x < 0 || n.x > size.w) n.vx *= -1
        if (n.y < 0 || n.y > size.h) n.vy *= -1
      }
      ctx.lineWidth = 1
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const d = Math.hypot(dx, dy)
          if (d < LINK) {
            ctx.strokeStyle = `rgba(91, 141, 239, ${(1 - d / LINK) * 0.3})`
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
        if (pointer) {
          const d = Math.hypot(nodes[i].x - pointer.x, nodes[i].y - pointer.y)
          if (d < 190) {
            ctx.strokeStyle = `rgba(43, 108, 176, ${(1 - d / 190) * 0.5})`
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(pointer.x, pointer.y)
            ctx.stroke()
          }
        }
      }
      nodes.forEach((n, i) => {
        ctx.fillStyle =
          i % 19 === 0 ? PINK : i % 23 === 0 ? YELLOW : `${BLUE_DEEP}99`
        ctx.beginPath()
        ctx.arc(n.x, n.y, i % 19 === 0 || i % 23 === 0 ? 2.4 : 1.8, 0, Math.PI * 2)
        ctx.fill()
      })
    }
  }
}

export function NetworkField() {
  const [render] = React.useState(createNetworkRenderer)
  return <Canvas render={render} />
}

/* ------------------------------------------------------------------ */
/* B · Dot wave — precise lattice, waves travel the field, cursor      */
/*     raises a ripple                                                 */
/* ------------------------------------------------------------------ */

function createDotWaveRenderer(): CanvasRenderer {
  {
    return (ctx, size, t, pointer) => {
      const GAP = 34
      const cols = Math.ceil(size.w / GAP) + 1
      const rows = Math.ceil(size.h / GAP) + 1
      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          const x = cx * GAP
          const y = cy * GAP
          const w1 = Math.sin(x * 0.012 + y * 0.007 - t * 1.1)
          const w2 = Math.sin(x * -0.006 + y * 0.011 - t * 0.7)
          let a = (w1 * 0.5 + 0.5) * (w2 * 0.5 + 0.5)
          let r = 0.7 + a * 1.5
          if (pointer) {
            const d = Math.hypot(x - pointer.x, y - pointer.y)
            if (d < 150) {
              const boost = (1 - d / 150) ** 2
              r += boost * 2.2
              a += boost * 0.6
            }
          }
          const idx = cx * 7 + cy * 13
          ctx.fillStyle =
            idx % 41 === 0
              ? `rgba(240, 180, 41, ${0.25 + a * 0.5})`
              : idx % 31 === 0
                ? `rgba(255, 158, 200, ${0.3 + a * 0.5})`
                : `rgba(43, 108, 176, ${0.12 + a * 0.42})`
          ctx.beginPath()
          ctx.arc(x, y, r, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }
}

export function DotWave() {
  const [render] = React.useState(createDotWaveRenderer)
  return <Canvas render={render} />
}

/* ------------------------------------------------------------------ */
/* C · Wire globe — rotating dot sphere with pulsing arcs (GitHub /    */
/*     Stripe globe school, hand-projected 2D, no three.js needed)     */
/* ------------------------------------------------------------------ */

type Arc = { a: [number, number, number]; b: [number, number, number]; start: number; hue: string }

function fibonacciSphere(n: number): [number, number, number][] {
  const pts: [number, number, number][] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = golden * i
    pts.push([Math.cos(theta) * r, y, Math.sin(theta) * r])
  }
  return pts
}

function slerp(
  a: [number, number, number],
  b: [number, number, number],
  u: number
): [number, number, number] {
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))
  const omega = Math.acos(dot)
  if (omega < 1e-4) return a
  const sinOmega = Math.sin(omega)
  const ka = Math.sin((1 - u) * omega) / sinOmega
  const kb = Math.sin(u * omega) / sinOmega
  return [
    a[0] * ka + b[0] * kb,
    a[1] * ka + b[1] * kb,
    a[2] * ka + b[2] * kb,
  ]
}

function createWireGlobeRenderer(): CanvasRenderer {
  {
    const points = fibonacciSphere(440)
    let arcs: Arc[] = []
    return (ctx, size, t, pointer) => {
      const R = Math.min(size.w, size.h) * 0.42
      const cxs = size.w * 0.66
      const cys = size.h * 0.52
      const tiltBase = 0.35
      const tilt =
        tiltBase + (pointer ? ((pointer.y / size.h) * 2 - 1) * 0.12 : 0)
      const spin =
        t * 0.12 + (pointer ? ((pointer.x / size.w) * 2 - 1) * 0.25 : 0)

      const project = (p: [number, number, number]) => {
        const x1 = p[0] * Math.cos(spin) + p[2] * Math.sin(spin)
        const z1 = -p[0] * Math.sin(spin) + p[2] * Math.cos(spin)
        const y2 = p[1] * Math.cos(tilt) - z1 * Math.sin(tilt)
        const z2 = p[1] * Math.sin(tilt) + z1 * Math.cos(tilt)
        return { x: cxs + x1 * R, y: cys - y2 * R, z: z2 }
      }

      for (const p of points) {
        const s = project(p)
        const front = s.z > 0
        ctx.fillStyle = front
          ? `rgba(43, 108, 176, ${0.25 + s.z * 0.5})`
          : 'rgba(43, 108, 176, 0.07)'
        ctx.beginPath()
        ctx.arc(s.x, s.y, front ? 1.9 : 1.1, 0, Math.PI * 2)
        ctx.fill()
      }

      // keep ~6 arcs alive; each pulse lives ~2.6s
      arcs = arcs.filter((arc) => t - arc.start < 2.6)
      while (arcs.length < 6) {
        const a = points[Math.floor((Math.sin(arcs.length * 91 + t) * 0.5 + 0.5) * points.length) % points.length]
        const b = points[Math.floor((Math.cos(arcs.length * 57 + t * 1.3) * 0.5 + 0.5) * points.length) % points.length]
        arcs.push({
          a,
          b,
          start: t,
          hue: arcs.length % 3 === 0 ? PINK : arcs.length % 5 === 0 ? YELLOW : BLUE,
        })
      }
      for (const arc of arcs) {
        const u = (t - arc.start) / 2.6
        const head = Math.min(1, u * 1.25)
        const tail = Math.max(0, head - 0.3)
        ctx.strokeStyle = arc.hue
        ctx.lineWidth = 1.4
        ctx.beginPath()
        let started = false
        for (let s = 0; s <= 28; s++) {
          const uu = tail + ((head - tail) * s) / 28
          const p = slerp(arc.a, arc.b, uu)
          const lift = 1 + Math.sin(uu * Math.PI) * 0.22
          const pr = project([p[0] * lift, p[1] * lift, p[2] * lift])
          if (pr.z < -0.15) {
            started = false
            continue
          }
          if (!started) {
            ctx.moveTo(pr.x, pr.y)
            started = true
          } else ctx.lineTo(pr.x, pr.y)
        }
        ctx.globalAlpha = Math.sin(Math.min(1, u) * Math.PI)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    }
  }
}

export function WireGlobe() {
  const [render] = React.useState(createWireGlobeRenderer)
  return <Canvas render={render} />
}

/* ------------------------------------------------------------------ */
/* D · Circuit pulses — signals travelling a faint grid, PCB style     */
/* ------------------------------------------------------------------ */

type Walker = {
  x: number
  y: number
  dx: number
  dy: number
  trail: { x: number; y: number }[]
  born: number
  hue: string
}

function createCircuitRenderer(): CanvasRenderer {
  {
    const GRID = 44
    let walkers: Walker[] = []
    let lastT = 0
    let seed = 1
    const rand = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    return (ctx, size, t, pointer) => {
      const dt = Math.min(0.05, Math.max(0.001, t - lastT))
      lastT = t

      // faint lattice
      ctx.strokeStyle = 'rgba(43, 108, 176, 0.06)'
      ctx.lineWidth = 1
      for (let x = 0; x <= size.w; x += GRID) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, size.h)
        ctx.stroke()
      }
      for (let y = 0; y <= size.h; y += GRID) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(size.w, y)
        ctx.stroke()
      }

      walkers = walkers.filter((w) => t - w.born < 4 && w.trail.length < 400)
      while (walkers.length < 9) {
        const dir = rand() < 0.5
        walkers.push({
          x: Math.round((rand() * size.w) / GRID) * GRID,
          y: Math.round((rand() * size.h) / GRID) * GRID,
          dx: dir ? (rand() < 0.5 ? 1 : -1) : 0,
          dy: dir ? 0 : rand() < 0.5 ? 1 : -1,
          trail: [],
          born: t,
          hue: rand() < 0.12 ? PINK : rand() < 0.5 ? BLUE : BLUE_DEEP,
        })
      }

      const SPEED = 170
      for (const w of walkers) {
        // pointer bends nearby signals toward the cursor's grid lane
        const step = SPEED * dt
        w.x += w.dx * step
        w.y += w.dy * step
        w.trail.push({ x: w.x, y: w.y })
        if (w.trail.length > 30) w.trail.shift()
        const onNode =
          Math.abs(w.x % GRID) < step && Math.abs(w.y % GRID) < step
        if (onNode && rand() < 0.28) {
          const horizontal = w.dx !== 0
          const toward =
            pointer && rand() < 0.5
              ? horizontal
                ? Math.sign(pointer.y - w.y)
                : Math.sign(pointer.x - w.x)
              : rand() < 0.5
                ? 1
                : -1
          if (horizontal) {
            w.dx = 0
            w.dy = toward || 1
          } else {
            w.dy = 0
            w.dx = toward || 1
          }
          w.x = Math.round(w.x / GRID) * GRID
          w.y = Math.round(w.y / GRID) * GRID
        }
        if (w.x < 0 || w.x > size.w || w.y < 0 || w.y > size.h) {
          w.born = -10 // recycle next frame
        }

        for (let i = 1; i < w.trail.length; i++) {
          ctx.strokeStyle = w.hue
          ctx.globalAlpha = (i / w.trail.length) * 0.55
          ctx.lineWidth = 1.6
          ctx.beginPath()
          ctx.moveTo(w.trail[i - 1].x, w.trail[i - 1].y)
          ctx.lineTo(w.trail[i].x, w.trail[i].y)
          ctx.stroke()
        }
        ctx.globalAlpha = 1
        ctx.fillStyle = w.hue
        ctx.beginPath()
        ctx.arc(w.x, w.y, 2.4, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
}

export function CircuitPulse() {
  const [render] = React.useState(createCircuitRenderer)
  return <Canvas render={render} />
}
