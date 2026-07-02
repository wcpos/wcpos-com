'use client'

/**
 * PROTOTYPE — how-it-fits motion lab. DO NOT MERGE.
 *
 * Three animated diagram variants for the /downloads "How it fits together"
 * section, switchable via ?variant= (orbit | float | fling | original).
 * The winner gets rewritten properly into how-it-fits.tsx; the rest of this
 * file is thrown away.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  Laptop,
  Smartphone,
  Globe,
  Package,
  RefreshCw,
  CloudOff,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'motion/react'
import { Section, Container } from '@/components/ui/section'
import { HowItFits } from '@/components/downloads/how-it-fits'

/* ------------------------------------------------------------------ */
/* Shared geometry + data                                              */
/* ------------------------------------------------------------------ */

const C = 220 // logical centre of the 440x440 diagram space
const ORBIT_R = 138
const DIAGRAM_LABEL =
  'A WooCommerce store with the WCPOS plugin sits at the centre, connected over a REST API to the desktop, iOS, Android and web apps, which all stay in sync.'

type NodeSpec = {
  key: string
  label: string
  icon: LucideIcon
  angle: number
  size: number
}

const NODES: NodeSpec[] = [
  { key: 'desktop', label: 'Desktop', icon: Laptop, angle: -90, size: 66 },
  { key: 'ios', label: 'iOS & iPad', icon: Smartphone, angle: 0, size: 58 },
  { key: 'android', label: 'Android', icon: Smartphone, angle: 90, size: 58 },
  { key: 'web', label: 'Web', icon: Globe, angle: 180, size: 62 },
]

function homeOf(node: NodeSpec) {
  const rad = (node.angle * Math.PI) / 180
  return { x: C + ORBIT_R * Math.cos(rad), y: C + ORBIT_R * Math.sin(rad) }
}

const pct = (v: number) => `${v / 4.4}%`

/* Copy shared with the original section (duplicated — throwaway file) */
const POINTS = [
  {
    icon: Package,
    title: 'One plugin is the only setup',
    body: 'The free plugin adds a secure REST API to your WooCommerce store. That’s the whole install — nothing to host or configure per device.',
  },
  {
    icon: RefreshCw,
    title: 'Every app reads and writes the same store',
    body: 'Ring up a sale on the desktop, refund it on your phone — one set of products, orders and customers, updating in real time.',
  },
  {
    icon: CloudOff,
    title: 'Offline-first, so the till never stops',
    body: 'Each device keeps working without a connection and re-syncs the moment it’s back online.',
  },
]

const SYNC_CHIPS = [
  'Products & prices',
  'Stock levels',
  'Orders',
  'Customers',
  'Tax & receipts',
]

/* ------------------------------------------------------------------ */
/* Shared diagram scaffolding                                          */
/* ------------------------------------------------------------------ */

const FLOW_CSS = `
  @keyframes hif-lab-flow { to { stroke-dashoffset: -16; } }
  .hif-lab-flow {
    stroke-dasharray: 1 7;
    animation: hif-lab-flow 1.4s linear infinite;
  }
`

/** Refs + imperative apply() so variants can drive positions from rAF. */
function useDiagramRefs() {
  const wrappers = useRef<(HTMLDivElement | null)[]>([])
  const baseLines = useRef<(SVGLineElement | null)[]>([])
  const flowLines = useRef<(SVGLineElement | null)[]>([])

  function apply(points: { x: number; y: number }[], hovered: number | null) {
    points.forEach((p, i) => {
      const w = wrappers.current[i]
      if (w) {
        w.style.left = pct(p.x)
        w.style.top = pct(p.y)
      }
      for (const lines of [baseLines, flowLines]) {
        const l = lines.current[i]
        if (l) {
          l.setAttribute('x2', String(p.x))
          l.setAttribute('y2', String(p.y))
        }
      }
      const f = flowLines.current[i]
      if (f) {
        f.style.opacity = hovered === null ? '0.5' : hovered === i ? '1' : '0.2'
        f.setAttribute('stroke-width', hovered === i ? '2.5' : '1.5')
      }
    })
  }

  return { wrappers, baseLines, flowLines, apply }
}

function DiagramLines({
  baseLines,
  flowLines,
}: {
  baseLines: React.RefObject<(SVGLineElement | null)[]>
  flowLines: React.RefObject<(SVGLineElement | null)[]>
}) {
  return (
    <svg viewBox="0 0 440 440" className="absolute inset-0 h-full w-full">
      <g className="stroke-border" strokeWidth={1.5}>
        {NODES.map((n, i) => {
          const h = homeOf(n)
          return (
            <line
              key={n.key}
              ref={(el) => {
                baseLines.current[i] = el
              }}
              x1={C}
              y1={C}
              x2={h.x}
              y2={h.y}
            />
          )
        })}
      </g>
      <g className="stroke-wcpos-red" fill="none">
        {NODES.map((n, i) => {
          const h = homeOf(n)
          return (
            <line
              key={n.key}
              ref={(el) => {
                flowLines.current[i] = el
              }}
              className="hif-lab-flow"
              style={{ opacity: 0.5, animationDelay: `${i * 0.3}s` }}
              x1={C}
              y1={C}
              x2={h.x}
              y2={h.y}
            />
          )
        })}
      </g>
    </svg>
  )
}

function BallContent({
  node,
  hovered,
  className,
}: {
  node: NodeSpec
  hovered: boolean
  className?: string
}) {
  const Icon = node.icon
  return (
    <div className={className}>
      <div
        className={`flex h-[60px] w-[60px] items-center justify-center rounded-full border-[1.5px] bg-card text-slate-500 shadow-sm transition-all duration-200 dark:text-slate-400 ${
          hovered
            ? 'scale-110 border-wcpos-red/60 text-wcpos-red dark:text-wcpos-red-accent'
            : 'border-border'
        }`}
      >
        <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
      </div>
      <span className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium text-muted-foreground">
        {node.label}
      </span>
    </div>
  )
}

function Hub({ children }: { children?: React.ReactNode }) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: '50%', top: '50%' }}
    >
      {children ?? <HubBody />}
    </div>
  )
}

function HubBody() {
  return (
    <div className="flex h-[112px] w-[112px] flex-col items-center justify-center rounded-full bg-wcpos-red text-center">
      <span className="text-[13px] font-semibold text-white">Your store</span>
      <span className="text-[10.5px] text-white/90">WooCommerce</span>
      <span className="text-[9px] text-white/70">+ WCPOS plugin</span>
    </div>
  )
}

/** Logical-space pointer tracking within the 440x440 diagram box. */
function useLogicalPointer(container: React.RefObject<HTMLDivElement | null>) {
  const pointer = useRef<{ x: number; y: number } | null>(null)

  const onPointerMove = (e: React.PointerEvent) => {
    const rect = container.current?.getBoundingClientRect()
    if (!rect) return
    pointer.current = {
      x: ((e.clientX - rect.left) / rect.width) * 440,
      y: ((e.clientY - rect.top) / rect.height) * 440,
    }
  }
  const onPointerLeave = () => {
    pointer.current = null
  }

  return { pointer, onPointerMove, onPointerLeave }
}

/* ------------------------------------------------------------------ */
/* Variant A — orbit: satellites circle the hub, 3D tilt follows the   */
/* cursor, hovering slows the orbit and lights that device's line      */
/* ------------------------------------------------------------------ */

function VariantOrbit() {
  const container = useRef<HTMLDivElement>(null)
  const { pointer, onPointerMove, onPointerLeave } = useLogicalPointer(container)
  const { wrappers, baseLines, flowLines, apply } = useDiagramRefs()
  const [hovered, setHovered] = useState<number | null>(null)
  const hoveredRef = useRef<number | null>(null)
  const setHover = (i: number | null) => {
    hoveredRef.current = i
    setHovered(i)
  }

  const baseAngle = useRef(0)
  const speed = useRef(1)

  const rotateX = useSpring(0, { stiffness: 120, damping: 18 })
  const rotateY = useSpring(0, { stiffness: 120, damping: 18 })

  useAnimationFrame((t, dt) => {
    const target = pointer.current ? 0.18 : 1
    speed.current += (target - speed.current) * Math.min(1, dt * 0.004)
    baseAngle.current += dt * 0.000115 * speed.current * 360 * 0.05

    if (pointer.current) {
      rotateY.set(((pointer.current.x - C) / C) * 7)
      rotateX.set((-(pointer.current.y - C) / C) * 7)
    } else {
      rotateX.set(0)
      rotateY.set(0)
    }

    apply(
      NODES.map((n, i) => {
        const rad = ((n.angle + baseAngle.current) * Math.PI) / 180
        const r = ORBIT_R + 7 * Math.sin(t / 900 + i * 1.7)
        return { x: C + r * Math.cos(rad), y: C + r * Math.sin(rad) }
      }),
      hoveredRef.current,
    )
  })

  return (
    <motion.div
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      className="w-full max-w-[440px]"
    >
      <div
        ref={container}
        role="img"
        aria-label={DIAGRAM_LABEL}
        className="relative aspect-square w-full"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <DiagramLines baseLines={baseLines} flowLines={flowLines} />
        {NODES.map((n, i) => {
          const h = homeOf(n)
          return (
            <div
              key={n.key}
              ref={(el) => {
                wrappers.current[i] = el
              }}
              className="absolute"
              style={{ left: pct(h.x), top: pct(h.y) }}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
            >
              <BallContent
                node={n}
                hovered={hovered === i}
                className="-translate-x-1/2 -translate-y-1/2"
              />
            </div>
          )
        })}
        <Hub />
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Variant B — float: balls drift at home and are magnetically pulled  */
/* toward the cursor; hovering a ball fires sync packets to the hub    */
/* ------------------------------------------------------------------ */

function VariantFloat() {
  const container = useRef<HTMLDivElement>(null)
  const { pointer, onPointerMove, onPointerLeave } = useLogicalPointer(container)
  const { wrappers, baseLines, flowLines, apply } = useDiagramRefs()
  const [hovered, setHovered] = useState<number | null>(null)
  const hoveredRef = useRef<number | null>(null)
  const setHover = (i: number | null) => {
    hoveredRef.current = i
    setHovered(i)
  }

  const offsets = useRef(NODES.map(() => ({ x: 0, y: 0 })))
  const packetOut = useRef<HTMLDivElement>(null)
  const packetBack = useRef<HTMLDivElement>(null)
  const positions = useRef(NODES.map(homeOf))

  useAnimationFrame((t, dt) => {
    const pts = NODES.map((n, i) => {
      const home = homeOf(n)
      const drift = {
        x: 9 * Math.sin(t * 0.0006 + i * 2.1),
        y: 7 * Math.cos(t * 0.0007 + i * 1.3),
      }

      let target = { x: 0, y: 0 }
      const p = pointer.current
      if (p) {
        const dx = p.x - home.x
        const dy = p.y - home.y
        const dist = Math.max(24, Math.hypot(dx, dy))
        const pull = 34 * Math.exp(-dist / 170)
        target = { x: (dx / dist) * pull * 3.2, y: (dy / dist) * pull * 3.2 }
      }
      const o = offsets.current[i]
      const k = Math.min(1, dt * 0.006)
      o.x += (target.x - o.x) * k
      o.y += (target.y - o.y) * k

      return { x: home.x + drift.x + o.x, y: home.y + drift.y + o.y }
    })
    positions.current = pts
    apply(pts, hoveredRef.current)

    const hi = hoveredRef.current
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
      const ball = pts[hi]
      const tt = ((t / 1100 + phase) % 1 + 1) % 1
      const from = phase === 0 ? { x: C, y: C } : ball
      const to = phase === 0 ? ball : { x: C, y: C }
      el.style.opacity = '1'
      el.style.left = pct(from.x + (to.x - from.x) * tt)
      el.style.top = pct(from.y + (to.y - from.y) * tt)
    }
  })

  return (
    <div
      ref={container}
      role="img"
      aria-label={DIAGRAM_LABEL}
      className="relative aspect-square w-full max-w-[440px]"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <DiagramLines baseLines={baseLines} flowLines={flowLines} />
      <div
        ref={packetOut}
        className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-wcpos-red opacity-0 shadow-[0_0_6px_rgba(220,60,50,0.7)]"
      />
      <div
        ref={packetBack}
        className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-wcpos-red opacity-0 shadow-[0_0_6px_rgba(220,60,50,0.7)]"
      />
      {NODES.map((n, i) => {
        const h = homeOf(n)
        return (
          <div
            key={n.key}
            ref={(el) => {
              wrappers.current[i] = el
            }}
            className="absolute"
            style={{ left: pct(h.x), top: pct(h.y) }}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
          >
            <BallContent
              node={n}
              hovered={hovered === i}
              className="-translate-x-1/2 -translate-y-1/2"
            />
          </div>
        )
      })}
      <Hub>
        <motion.div
          animate={{ scale: [1, 1.045, 1] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <HubBody />
        </motion.div>
      </Hub>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Variant C — fling: grab a ball and let go — it springs back on an   */
/* elastic connector; everything bobs gently at rest                   */
/* ------------------------------------------------------------------ */

function FlingBall({
  node,
  index,
  registerWrapper,
  onOffset,
  onDragState,
}: {
  node: NodeSpec
  index: number
  registerWrapper: (i: number, el: HTMLDivElement | null) => void
  onOffset: (i: number, x: number, y: number) => void
  onDragState: (i: number, dragging: boolean) => void
}) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const [dragging, setDragging] = useState(false)
  const home = homeOf(node)

  useAnimationFrame(() => {
    onOffset(index, x.get(), y.get())
  })

  return (
    <div
      ref={(el) => registerWrapper(index, el)}
      className="absolute"
      style={{ left: pct(home.x), top: pct(home.y) }}
    >
      <motion.div
        drag
        dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
        dragElastic={0.45}
        dragTransition={{ bounceStiffness: 250, bounceDamping: 11 }}
        whileDrag={{ scale: 1.12 }}
        style={{ x, y, touchAction: 'none' }}
        className={dragging ? 'cursor-grabbing' : 'cursor-grab'}
        onDragStart={() => {
          setDragging(true)
          onDragState(index, true)
        }}
        onDragEnd={() => {
          setDragging(false)
          onDragState(index, false)
        }}
      >
        <div
          className="hif-bob -translate-x-1/2 -translate-y-1/2"
          style={{ animationDelay: `${index * 0.6}s` }}
        >
          <BallContent node={node} hovered={dragging} className="relative" />
        </div>
      </motion.div>
    </div>
  )
}

function VariantFling() {
  const container = useRef<HTMLDivElement>(null)
  const { wrappers, baseLines, flowLines, apply } = useDiagramRefs()
  const offsets = useRef(NODES.map(() => ({ x: 0, y: 0 })))
  const draggingRef = useRef<number | null>(null)

  useAnimationFrame(() => {
    const rect = container.current?.getBoundingClientRect()
    const scale = rect ? rect.width / 440 : 1
    apply(
      NODES.map((n, i) => {
        const home = homeOf(n)
        return {
          x: home.x + offsets.current[i].x / scale,
          y: home.y + offsets.current[i].y / scale,
        }
      }),
      draggingRef.current,
    )
  })

  return (
    <div
      ref={container}
      role="img"
      aria-label={DIAGRAM_LABEL}
      className="relative aspect-square w-full max-w-[440px]"
    >
      <style>{`
        @keyframes hif-bob { 0%,100% { transform: translate(-50%,-50%) translateY(-3px); } 50% { transform: translate(-50%,-50%) translateY(3px); } }
        .hif-bob { animation: hif-bob 3.4s ease-in-out infinite; }
      `}</style>
      <DiagramLines baseLines={baseLines} flowLines={flowLines} />
      {NODES.map((n, i) => (
        <FlingBall
          key={n.key}
          node={n}
          index={i}
          registerWrapper={(idx, el) => {
            wrappers.current[idx] = el
          }}
          onOffset={(idx, ox, oy) => {
            offsets.current[idx] = { x: ox, y: oy }
          }}
          onDragState={(idx, dragging) => {
            draggingRef.current = dragging ? idx : null
          }}
        />
      ))}
      <Hub />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Mix — float physics + slow orbital drift, three sphere treatments   */
/* ------------------------------------------------------------------ */

const DRIFT_DEG_PER_MS = 0.0022 // ~2.2 deg/s — one lap in ~2.7 min

type BallSkinProps = { node: NodeSpec; hovered: boolean; className?: string }
type BallSkin = (props: BallSkinProps) => React.ReactNode

function BallLabel({ label }: { label: string }) {
  return (
    <span className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium text-muted-foreground">
      {label}
    </span>
  )
}

/** Soft 3D-shaded sphere sitting above the canvas. */
function ShadedBall({ node, hovered, className }: BallSkinProps) {
  const Icon = node.icon
  return (
    <div className={className}>
      <div
        className={`flex items-center justify-center rounded-full bg-card transition-all duration-200 ${
          hovered
            ? 'scale-110 text-wcpos-red dark:text-wcpos-red-accent'
            : 'text-slate-500 dark:text-slate-300'
        }`}
        style={{
          width: node.size,
          height: node.size,
          backgroundImage:
            'radial-gradient(circle at 30% 26%, rgba(255,255,255,0.6), rgba(255,255,255,0) 55%), radial-gradient(circle at 72% 82%, rgba(15,23,42,0.16), rgba(15,23,42,0) 60%)',
          boxShadow: hovered
            ? '0 16px 26px -12px rgba(15,23,42,0.45), 0 0 0 2px rgba(199,57,44,0.4)'
            : '0 12px 22px -12px rgba(15,23,42,0.35)',
        }}
      >
        <Icon
          size={Math.round(node.size * 0.36)}
          strokeWidth={1.6}
          aria-hidden="true"
        />
      </div>
      <BallLabel label={node.label} />
    </div>
  )
}

/** Frosted-glass sphere floating over a calm blue halo. */
function GlassBall({ node, hovered, className }: BallSkinProps) {
  const Icon = node.icon
  return (
    <div className={className}>
      <span
        aria-hidden="true"
        className="absolute rounded-full blur-xl transition-opacity duration-300"
        style={{
          inset: -14,
          background:
            'radial-gradient(circle, rgba(120,165,215,0.5), rgba(120,165,215,0) 70%)',
          opacity: hovered ? 1 : 0.55,
        }}
      />
      <div
        className={`relative flex items-center justify-center rounded-full border backdrop-blur-md transition-all duration-200 ${
          hovered
            ? 'scale-110 border-wcpos-red/50 text-wcpos-red dark:text-wcpos-red-accent'
            : 'border-white/70 text-slate-600 dark:border-white/25 dark:text-slate-200'
        }`}
        style={{
          width: node.size,
          height: node.size,
          background:
            'linear-gradient(145deg, rgba(255,255,255,0.6), rgba(255,255,255,0.15))',
          boxShadow:
            'inset 0 1px 1px rgba(255,255,255,0.9), 0 10px 24px -14px rgba(30,58,95,0.5)',
        }}
      >
        <Icon
          size={Math.round(node.size * 0.36)}
          strokeWidth={1.6}
          aria-hidden="true"
        />
      </div>
      <BallLabel label={node.label} />
    </div>
  )
}

/** Solid ink sphere that flips to brand red on hover. */
function InkBall({ node, hovered, className }: BallSkinProps) {
  const Icon = node.icon
  return (
    <div className={className}>
      <div
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
      <BallLabel label={node.label} />
    </div>
  )
}

/** Hub with the same shading treatment so it reads as one family. */
function ShadedHubBody() {
  return (
    <div
      className="flex h-[112px] w-[112px] flex-col items-center justify-center rounded-full bg-wcpos-red text-center"
      style={{
        backgroundImage:
          'radial-gradient(circle at 32% 26%, rgba(255,255,255,0.3), rgba(255,255,255,0) 48%), radial-gradient(circle at 70% 82%, rgba(0,0,0,0.2), rgba(0,0,0,0) 58%)',
        boxShadow: '0 20px 36px -16px rgba(160,40,30,0.55)',
      }}
    >
      <span className="text-[13px] font-semibold text-white">Your store</span>
      <span className="text-[10.5px] text-white/90">WooCommerce</span>
      <span className="text-[9px] text-white/70">+ WCPOS plugin</span>
    </div>
  )
}

function MixDiagram({ Ball }: { Ball: BallSkin }) {
  const container = useRef<HTMLDivElement>(null)
  const { pointer, onPointerMove, onPointerLeave } = useLogicalPointer(container)
  const { wrappers, baseLines, flowLines, apply } = useDiagramRefs()
  const [hovered, setHovered] = useState<number | null>(null)
  const hoveredRef = useRef<number | null>(null)
  const setHover = (i: number | null) => {
    hoveredRef.current = i
    setHovered(i)
  }

  const offsets = useRef(NODES.map(() => ({ x: 0, y: 0 })))
  const packetOut = useRef<HTMLDivElement>(null)
  const packetBack = useRef<HTMLDivElement>(null)

  useAnimationFrame((t, dt) => {
    const driftAngle = t * DRIFT_DEG_PER_MS
    const pts = NODES.map((n, i) => {
      const rad = ((n.angle + driftAngle) * Math.PI) / 180
      const home = { x: C + ORBIT_R * Math.cos(rad), y: C + ORBIT_R * Math.sin(rad) }
      const drift = {
        x: 9 * Math.sin(t * 0.0006 + i * 2.1),
        y: 7 * Math.cos(t * 0.0007 + i * 1.3),
      }

      let target = { x: 0, y: 0 }
      const p = pointer.current
      if (p) {
        const dx = p.x - home.x
        const dy = p.y - home.y
        const dist = Math.max(24, Math.hypot(dx, dy))
        const pull = 34 * Math.exp(-dist / 170)
        target = { x: (dx / dist) * pull * 3.2, y: (dy / dist) * pull * 3.2 }
      }
      const o = offsets.current[i]
      const k = Math.min(1, dt * 0.006)
      o.x += (target.x - o.x) * k
      o.y += (target.y - o.y) * k

      return { x: home.x + drift.x + o.x, y: home.y + drift.y + o.y }
    })
    apply(pts, hoveredRef.current)

    const hi = hoveredRef.current
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
      const ball = pts[hi]
      const tt = ((t / 1100 + phase) % 1 + 1) % 1
      const from = phase === 0 ? { x: C, y: C } : ball
      const to = phase === 0 ? ball : { x: C, y: C }
      el.style.opacity = '1'
      el.style.left = pct(from.x + (to.x - from.x) * tt)
      el.style.top = pct(from.y + (to.y - from.y) * tt)
    }
  })

  return (
    <div
      ref={container}
      role="img"
      aria-label={DIAGRAM_LABEL}
      className="relative aspect-square w-full max-w-[440px]"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <DiagramLines baseLines={baseLines} flowLines={flowLines} />
      <div
        ref={packetOut}
        className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-wcpos-red opacity-0 shadow-[0_0_6px_rgba(220,60,50,0.7)]"
      />
      <div
        ref={packetBack}
        className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-wcpos-red opacity-0 shadow-[0_0_6px_rgba(220,60,50,0.7)]"
      />
      {NODES.map((n, i) => {
        const h = homeOf(n)
        return (
          <div
            key={n.key}
            ref={(el) => {
              wrappers.current[i] = el
            }}
            className="absolute"
            style={{ left: pct(h.x), top: pct(h.y) }}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
          >
            <Ball
              node={n}
              hovered={hovered === i}
              className="-translate-x-1/2 -translate-y-1/2"
            />
          </div>
        )
      })}
      <Hub>
        <motion.div
          animate={{ scale: [1, 1.045, 1] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ShadedHubBody />
        </motion.div>
      </Hub>
    </div>
  )
}

const MixShaded = () => <MixDiagram Ball={ShadedBall} />
const MixGlass = () => <MixDiagram Ball={GlassBall} />
const MixInk = () => <MixDiagram Ball={InkBall} />

/* ------------------------------------------------------------------ */
/* Section shell + switcher                                            */
/* ------------------------------------------------------------------ */

const VARIANTS = [
  { key: 'orbit', name: 'Orbit — satellites circle, 3D tilt', el: VariantOrbit },
  { key: 'mix-shaded', name: 'Mix — drift + shaded spheres', el: MixShaded },
  { key: 'mix-glass', name: 'Mix — drift + glass spheres', el: MixGlass },
  { key: 'mix-ink', name: 'Mix — drift + ink spheres', el: MixInk },
  { key: 'float', name: 'Float — previous round', el: VariantFloat },
  { key: 'fling', name: 'Fling — grab, throw, spring back', el: VariantFling },
  { key: 'original', name: 'Original — static', el: null },
] as const

function LabSection({ diagram }: { diagram: React.ReactNode }) {
  return (
    <Section tone="muted" spacing="default">
      <Container>
        <style>{FLOW_CSS}</style>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex justify-center">{diagram}</div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-wcpos-red dark:text-wcpos-red-accent">
              How it fits together
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100 md:text-3xl">
              One store at the centre. Every till in sync.
            </h2>
            <ul className="mt-7 space-y-6">
              {POINTS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-medium">{title}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {body}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-xs font-medium text-muted-foreground">
              What stays in sync
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {SYNC_CHIPS.map((chip) => (
                <li
                  key={chip}
                  className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-slate-600 dark:text-slate-300"
                >
                  {chip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </Section>
  )
}

function Switcher({
  current,
  onSelect,
}: {
  current: string
  onSelect: (key: string) => void
}) {
  const idx = Math.max(
    0,
    VARIANTS.findIndex((v) => v.key === current),
  )

  const go = (dir: 1 | -1) => {
    const next = VARIANTS[(idx + dir + VARIANTS.length) % VARIANTS.length]
    window.history.replaceState(null, '', `?variant=${next.key}`)
    onSelect(next.key)
  }

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return

    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (
        t.tagName === 'INPUT' ||
        t.tagName === 'TEXTAREA' ||
        t.isContentEditable
      )
        return
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (process.env.NODE_ENV === 'production') return null

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-slate-900 px-2 py-1.5 text-white shadow-xl ring-1 ring-white/10">
      <button
        type="button"
        onClick={() => go(-1)}
        className="rounded-full p-1.5 hover:bg-white/10"
        aria-label="Previous variant"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="min-w-[260px] px-2 text-center text-xs font-medium">
        {VARIANTS[idx].name}
      </span>
      <button
        type="button"
        onClick={() => go(1)}
        className="rounded-full p-1.5 hover:bg-white/10"
        aria-label="Next variant"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

const emptySubscribe = () => () => {}

function LabInner() {
  const reduced = useReducedMotion()
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
  const [override, setKey] = useState<string | null>(null)
  const key =
    override ??
    (mounted
      ? (new URLSearchParams(window.location.search).get('variant') ?? 'mix-shaded')
      : null)

  const variant = VARIANTS.find((v) => v.key === key) ?? VARIANTS[0]

  if (key === null) return <HowItFits />

  if (reduced || !variant.el) {
    return (
      <>
        <HowItFits />
        <Switcher current={variant.key} onSelect={setKey} />
      </>
    )
  }

  const Diagram = variant.el
  return (
    <>
      <LabSection diagram={<Diagram key={variant.key} />} />
      <Switcher current={variant.key} onSelect={setKey} />
    </>
  )
}

export function HowItFitsLab() {
  return <LabInner />
}
