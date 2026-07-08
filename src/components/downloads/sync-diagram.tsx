'use client'

import { useRef, useState } from 'react'
import { Laptop, Smartphone, Globe, type LucideIcon } from 'lucide-react'
import { motion, useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion'

/**
 * The "how it fits together" diagram: the store hub with the four device
 * spheres in a slow orbital drift around it. Spheres are magnetically
 * pulled toward the pointer; hovering one highlights its sync line and
 * sends packet dots to and from the hub.
 *
 * Positions are driven imperatively (refs + one rAF loop) rather than
 * through React state — four spheres and eight SVG lines re-rendering
 * at 60fps is exactly the churn this avoids. All motion stops under
 * prefers-reduced-motion; the layout then stays at the static home
 * positions with the flow lines dimmed (same fallback the previous
 * static diagram used).
 */

const SIZE = 440 // logical coordinate space; rendering scales via percentages
const CENTER = 220
const ORBIT_RADIUS = 138
const DRIFT_DEG_PER_MS = 0.0022 // one lap in ~2.7 minutes
const PACKET_PERIOD_MS = 1100

type DeviceKey = 'desktop' | 'ios' | 'android' | 'web'

export type SyncDiagramLabels = {
  ariaLabel: string
  devices: Record<DeviceKey, string>
  hub: {
    store: string
    platform: string
    plugin: string
  }
}

type DeviceNode = {
  key: DeviceKey
  icon: LucideIcon
  angle: number
  size: number
}


const DEVICES: DeviceNode[] = [
  { key: 'desktop', icon: Laptop, angle: -90, size: 66 },
  { key: 'ios', icon: Smartphone, angle: 0, size: 58 },
  { key: 'android', icon: Smartphone, angle: 90, size: 58 },
  { key: 'web', icon: Globe, angle: 180, size: 62 },
]

function homeAt(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: CENTER + ORBIT_RADIUS * Math.cos(rad),
    y: CENTER + ORBIT_RADIUS * Math.sin(rad),
  }
}

const pct = (v: number) => `${(v / SIZE) * 100}%`

function DeviceSphere({
  node,
  label,
  hovered,
}: {
  node: DeviceNode
  label: string
  hovered: boolean
}) {
  const Icon = node.icon
  return (
    <div className="-translate-x-1/2 -translate-y-1/2">
      <div
        data-testid={`device-sphere-${node.key}`}
        className={`flex items-center justify-center rounded-full shadow-lg transition-all duration-200 ${
          hovered
            ? 'scale-110 bg-wcpos-red text-white'
            : 'bg-slate-800 text-slate-100 dark:bg-slate-100 dark:text-slate-800'
        }`}
        style={{ width: node.size, height: node.size }}
      >
        <Icon
          size={Math.round(node.size * 0.36)}
          strokeWidth={1.6}
          aria-hidden="true"
        />
      </div>
      <span className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

function StoreHub({
  animate,
  labels,
}: {
  animate: boolean
  labels: SyncDiagramLabels['hub']
}) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: '50%', top: '50%' }}
    >
      <motion.div
        animate={animate ? { scale: [1, 1.045, 1] } : undefined}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div
          className="flex h-[112px] w-[112px] flex-col items-center justify-center rounded-full bg-wcpos-red text-center"
          style={{
            backgroundImage:
              'radial-gradient(circle at 32% 26%, rgba(255,255,255,0.3), rgba(255,255,255,0) 48%), radial-gradient(circle at 70% 82%, rgba(0,0,0,0.2), rgba(0,0,0,0) 58%)',
            boxShadow: '0 20px 36px -16px rgba(160,40,30,0.55)',
          }}
        >
          <span className="text-[13px] font-semibold text-white">
            {labels.store}
          </span>
          <span className="text-[10.5px] text-white/90">{labels.platform}</span>
          <span className="text-[9px] text-white/70">{labels.plugin}</span>
        </div>
      </motion.div>
    </div>
  )
}

export function SyncDiagram({
  labels,
}: {
  labels: SyncDiagramLabels
}) {
  const reduced = usePrefersReducedMotion()
  const container = useRef<HTMLDivElement>(null)
  const wrappers = useRef<(HTMLDivElement | null)[]>([])
  const baseLines = useRef<(SVGLineElement | null)[]>([])
  const flowLines = useRef<(SVGLineElement | null)[]>([])
  const packetOut = useRef<HTMLDivElement>(null)
  const packetBack = useRef<HTMLDivElement>(null)

  const pointer = useRef<{ x: number; y: number } | null>(null)
  const pullOffsets = useRef(DEVICES.map(() => ({ x: 0, y: 0 })))
  const [hovered, setHovered] = useState<number | null>(null)
  const hoveredRef = useRef<number | null>(null)

  const setHover = (i: number | null) => {
    hoveredRef.current = i
    setHovered(i)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const rect = container.current?.getBoundingClientRect()
    if (!rect) return
    pointer.current = {
      x: ((e.clientX - rect.left) / rect.width) * SIZE,
      y: ((e.clientY - rect.top) / rect.height) * SIZE,
    }
  }

  useAnimationFrame((t, dt) => {
    if (reduced) return

    const driftAngle = t * DRIFT_DEG_PER_MS
    const points = DEVICES.map((node, i) => {
      const home = homeAt(node.angle + driftAngle)
      const bob = {
        x: 9 * Math.sin(t * 0.0006 + i * 2.1),
        y: 7 * Math.cos(t * 0.0007 + i * 1.3),
      }

      // magnetic pull: eases toward the pointer, fading out with distance
      let target = { x: 0, y: 0 }
      const p = pointer.current
      if (p) {
        const dx = p.x - home.x
        const dy = p.y - home.y
        const dist = Math.max(24, Math.hypot(dx, dy))
        const pull = 109 * Math.exp(-dist / 170)
        target = { x: (dx / dist) * pull, y: (dy / dist) * pull }
      }
      const offset = pullOffsets.current[i]
      const ease = Math.min(1, dt * 0.006)
      offset.x += (target.x - offset.x) * ease
      offset.y += (target.y - offset.y) * ease

      return { x: home.x + bob.x + offset.x, y: home.y + bob.y + offset.y }
    })

    const hi = hoveredRef.current
    points.forEach((point, i) => {
      const wrapper = wrappers.current[i]
      if (wrapper) {
        wrapper.style.left = pct(point.x)
        wrapper.style.top = pct(point.y)
      }
      for (const lines of [baseLines, flowLines]) {
        const line = lines.current[i]
        if (line) {
          line.setAttribute('x2', String(point.x))
          line.setAttribute('y2', String(point.y))
        }
      }
      const flow = flowLines.current[i]
      if (flow) {
        flow.style.opacity = hi === null ? '0.5' : hi === i ? '1' : '0.2'
        flow.setAttribute('stroke-width', hi === i ? '2.5' : '1.5')
      }
    })

    // packet dots shuttle hub<->sphere while one is hovered
    for (const [ref, phase] of [
      [packetOut, 0],
      [packetBack, 0.5],
    ] as const) {
      const el = ref.current
      if (!el) continue
      if (hi === null) {
        el.style.opacity = '0'
        continue
      }
      const sphere = points[hi]
      const progress = (((t / PACKET_PERIOD_MS + phase) % 1) + 1) % 1
      const from = phase === 0 ? { x: CENTER, y: CENTER } : sphere
      const to = phase === 0 ? sphere : { x: CENTER, y: CENTER }
      el.style.opacity = '1'
      el.style.left = pct(from.x + (to.x - from.x) * progress)
      el.style.top = pct(from.y + (to.y - from.y) * progress)
    }
  })

  return (
    <div
      ref={container}
      role="img"
      aria-label={labels.ariaLabel}
      className="relative aspect-square w-full max-w-[440px]"
      onPointerMove={reduced ? undefined : onPointerMove}
      onPointerLeave={
        reduced
          ? undefined
          : () => {
              pointer.current = null
            }
      }
    >
      <style>{`
        @keyframes wcpos-sync-flow { to { stroke-dashoffset: -16; } }
        .wcpos-flow-line {
          stroke-dasharray: 1 7;
          animation: wcpos-sync-flow 1.4s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .wcpos-flow-line { animation: none; opacity: 0.25; }
        }
      `}</style>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 h-full w-full">
        <g className="stroke-border" strokeWidth={1.5}>
          {DEVICES.map((node, i) => {
            const home = homeAt(node.angle)
            return (
              <line
                key={node.key}
                ref={(el) => {
                  baseLines.current[i] = el
                }}
                x1={CENTER}
                y1={CENTER}
                x2={home.x}
                y2={home.y}
              />
            )
          })}
        </g>
        <g className="stroke-wcpos-red" fill="none">
          {DEVICES.map((node, i) => {
            const home = homeAt(node.angle)
            return (
              <line
                key={node.key}
                ref={(el) => {
                  flowLines.current[i] = el
                }}
                className="wcpos-flow-line"
                style={{ opacity: 0.5, animationDelay: `${i * 0.3}s` }}
                x1={CENTER}
                y1={CENTER}
                x2={home.x}
                y2={home.y}
              />
            )
          })}
        </g>
      </svg>
      <div
        ref={packetOut}
        className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-wcpos-red opacity-0 shadow-[0_0_6px_rgba(220,60,50,0.7)]"
      />
      <div
        ref={packetBack}
        className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-wcpos-red opacity-0 shadow-[0_0_6px_rgba(220,60,50,0.7)]"
      />
      {DEVICES.map((node, i) => {
        const home = homeAt(node.angle)
        return (
          <div
            key={node.key}
            ref={(el) => {
              wrappers.current[i] = el
            }}
            className="absolute"
            data-testid={`device-wrapper-${node.key}`}
            style={{ left: pct(home.x), top: pct(home.y) }}
            tabIndex={reduced ? undefined : 0}
            onPointerEnter={reduced ? undefined : () => setHover(i)}
            onPointerLeave={reduced ? undefined : () => setHover(null)}
            onFocus={reduced ? undefined : () => setHover(i)}
            onBlur={reduced ? undefined : () => setHover(null)}
          >
            <DeviceSphere
              node={node}
              label={labels.devices[node.key]}
              hovered={hovered === i}
            />
          </div>
        )
      })}
      <StoreHub animate={!reduced} labels={labels.hub} />
    </div>
  )
}
