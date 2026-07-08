'use client'

import * as React from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
} from 'motion/react'
import type { RoadmapData, RoadmapItem, RoadmapMilestone } from '@/types/roadmap'
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion'
import { formatDateForLocale } from '@/lib/date-format'
import { BugFixList } from './bug-fix-list'
import styles from './timeline.module.css'

/**
 * RoadmapTimeline — the "release train": one continuous vertical spine where
 * time is the hierarchy. The active release sits on a pulsing red node,
 * upcoming work rides below it, shipped releases fade out at the bottom.
 * Milestones and items come straight from the GitHub project board (see
 * services/core/external/github-roadmap.ts for the bucketing).
 *
 * Each phase group (Now / Next / Shipped) draws its own rail by scroll (ADR
 * 0013: movement that means progress) — a tone-coloured fill grows down a
 * muted track as the reader moves through the group and a glowing tip rides
 * its end, igniting each milestone node as it passes. Same mechanism as the
 * about-page StoryTimeline and downloads GetStartedSteps, kept per-group so
 * the three phase colours (red / slate / emerald) stay distinct. Reduced
 * motion renders a static, fully-drawn rail with solid nodes.
 */

const PROJECT_BOARD_URL = 'https://github.com/orgs/wcpos/projects/4'

type Tone = 'now' | 'next' | 'shipped'

/**
 * Per-phase rail colours, shared by the scroll-drawn fill, the traveling tip,
 * and the node it ignites so the three can never drift apart. `glow` is the
 * literal colour the tip's halo mixes with transparent (motion sets box-shadow
 * in JS, where Tailwind classes don't reach).
 */
const TONE: Record<Tone, { fill: string; ring: string; glow: string }> = {
  now: {
    fill: 'bg-wcpos-red',
    ring: 'border-wcpos-red',
    glow: 'hsl(var(--wcpos-red))',
  },
  next: {
    fill: 'bg-slate-400 dark:bg-slate-500',
    ring: 'border-slate-400 dark:border-slate-500',
    glow: '#94a3b8',
  },
  shipped: {
    fill: 'bg-emerald-500',
    ring: 'border-emerald-500',
    glow: '#10b981',
  },
}

/**
 * The phase chip in two states. It starts as a quiet outline and lights up to
 * a solid tone-coloured fill with white text the moment its group's rail
 * begins drawing — the same scroll signal that grows the fill — so the eye is
 * pulled to the phase as the reader arrives at it. "Now" is the active release
 * and stays lit. Both states carry a border so lighting up never shifts the
 * chip's box.
 */
const LABEL_TONE_LIT: Record<Tone, string> = {
  now: 'border border-transparent bg-wcpos-red text-white',
  next: 'border border-transparent bg-slate-500 text-white',
  // emerald-700 (not -500) so white text on the solid fill clears WCAG AA 4.5:1
  // for the 11px label — same contrast discipline as --primary in globals.css.
  shipped: 'border border-transparent bg-emerald-700 text-white',
}

// Idle reuses the lit "now" fill (Now never renders idle) and quiets the other
// phases to outlines until their rail scrolls into view — one source for "now"
// so the two maps can't drift.
const LABEL_TONE_IDLE: Record<Tone, string> = {
  ...LABEL_TONE_LIT,
  next: 'border border-slate-300 text-muted-foreground dark:border-slate-600',
  shipped: 'border border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
}

function fmtDue(dueOn: string | null, locale: string): string | null {
  if (!dueOn) return null
  // GitHub due dates are midnight-UTC timestamps; format in UTC so a
  // negative-offset server timezone can't shift them to the previous month.
  return formatDateForLocale(dueOn, locale, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function StatusGlyph({ status }: { status: RoadmapItem['status'] }) {
  const t = useTranslations('roadmap.status')

  if (status === 'done') {
    return (
      <svg viewBox="0 0 16 16" className="mt-1 size-4 shrink-0" aria-label={t('done')}>
        <circle cx="8" cy="8" r="7" className="fill-emerald-500" />
        <path
          d="M5 8.2l2 2 4-4.4"
          className="stroke-white"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  if (status === 'in_progress') {
    return (
      <svg
        viewBox="0 0 16 16"
        className="mt-1 size-4 shrink-0"
        aria-label={t('inProgress')}
      >
        <circle
          cx="8"
          cy="8"
          r="6.5"
          className="fill-none stroke-wcpos-red"
          strokeWidth="1.5"
        />
        <path d="M8 1.5 A6.5 6.5 0 0 1 8 14.5 Z" className="fill-wcpos-red" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 16 16" className="mt-1 size-4 shrink-0" aria-label={t('planned')}>
      <circle
        cx="8"
        cy="8"
        r="6.5"
        className="fill-none stroke-slate-300 dark:stroke-slate-600"
        strokeWidth="1.5"
        strokeDasharray="3 2.5"
      />
    </svg>
  )
}

function FeatureRow({ item }: { item: RoadmapItem }) {
  return (
    <li>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-start gap-3 py-2"
      >
        <StatusGlyph status={item.status} />
        <span className="min-w-0 flex-1">
          <span
            className="break-words font-medium group-hover:text-wcpos-red dark:group-hover:text-wcpos-red-accent"
            lang="en"
          >
            {item.title}
          </span>
          {item.description && (
            <span
              className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground"
              lang="en"
            >
              {item.description}
            </span>
          )}
        </span>
        {item.subIssueProgress && (
          <span className="mt-1 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
            {item.subIssueProgress.completed}/{item.subIssueProgress.total}
          </span>
        )}
      </a>
    </li>
  )
}

/**
 * The node on the rail. When animated it starts as a hollow ring and a
 * tone-coloured fill springs in the moment the traveling tip reaches it
 * (`active`); scrolling back up retracts it. The "now" node pulses once lit.
 * Static (reduced-motion) renders a solid node.
 */
function TimelineNode({
  tone,
  animate,
  active,
  nodeRef,
}: {
  tone: Tone
  animate: boolean
  active: boolean
  nodeRef: (el: HTMLSpanElement | null) => void
}) {
  // Centered on the w-0.5 rail at the section's left edge: content sits at
  // pl-8 (32px) / sm:pl-10 (40px), so a 16px node's center lands on the 2px
  // track (center x≈1px) at these offsets.
  const pos = 'absolute -left-[39px] top-2 size-4 sm:-left-[47px]'

  if (!animate) {
    return (
      <span
        aria-hidden
        ref={nodeRef}
        className={`${pos} rounded-full border-2 ${TONE[tone].ring} ${TONE[tone].fill}`}
      />
    )
  }

  return (
    <span aria-hidden ref={nodeRef} className={pos}>
      {/* hollow ring, waiting for the tip to arrive */}
      <span
        className={`absolute inset-0 rounded-full border-2 bg-background ${TONE[tone].ring}`}
      />
      {/* fill that pops in when the traveling tip passes this point */}
      <motion.span
        className={`absolute inset-0 rounded-full ${TONE[tone].fill} ${
          tone === 'now' ? styles.pulse : ''
        }`}
        initial={false}
        animate={{ scale: active ? 1 : 0, opacity: active ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      />
    </span>
  )
}

function TimelineMilestone({
  milestone,
  tone,
  animate,
  active,
  nodeRef,
}: {
  milestone: RoadmapMilestone
  tone: Tone
  animate: boolean
  active: boolean
  nodeRef: (el: HTMLSpanElement | null) => void
}) {
  const locale = useLocale()
  const t = useTranslations('roadmap.timeline')
  const pct =
    milestone.progress.total > 0
      ? Math.round((milestone.progress.completed / milestone.progress.total) * 100)
      : 0
  const due = fmtDue(milestone.dueOn, locale)
  const progressText =
    tone === 'shipped'
      ? due
        ? t('shippedWithDate', { date: due })
        : t('shipped')
      : due
        ? t('progressDue', {
            completed: milestone.progress.completed,
            total: milestone.progress.total,
            date: due,
          })
        : t('progress', {
            completed: milestone.progress.completed,
            total: milestone.progress.total,
          })

  return (
    <div className={tone === 'shipped' ? 'relative pb-14 opacity-60' : 'relative pb-14'}>
      <TimelineNode tone={tone} animate={animate} active={active} nodeRef={nodeRef} />

      {/* Ghost numeral behind the heading — version-style titles only */}
      {milestone.title.length <= 8 && (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 right-0 select-none font-mono text-7xl font-bold tracking-tighter text-foreground/[0.05] sm:text-8xl"
        >
          {milestone.title}
        </div>
      )}

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3
          className="break-words text-2xl font-semibold tracking-tight sm:text-3xl"
          lang="en"
        >
          {milestone.title}
        </h3>
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {progressText}
        </span>
      </div>

      {tone !== 'shipped' && (
        <div className="mt-3 h-1 w-full max-w-xs overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-wcpos-red transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {milestone.description && (
        <p className="mt-3 max-w-xl text-muted-foreground" lang="en">
          {milestone.description}
        </p>
      )}

      {milestone.features.length > 0 && (
        <ul className="mt-4 divide-y divide-border/60">
          {milestone.features.map((f) => (
            <FeatureRow key={f.id} item={f} />
          ))}
        </ul>
      )}

      <BugFixList bugs={milestone.bugs} />
    </div>
  )
}

/**
 * One phase group — its own scroll-drawn rail. Split from the emptiness check
 * so the hooks (useScroll et al.) always run against a mounted section rather
 * than a null target when a bucket is empty.
 */
function RailGroupInner({
  label,
  milestones,
  tone,
}: {
  label: string
  milestones: RoadmapMilestone[]
  tone: Tone
}) {
  const sectionRef = React.useRef<HTMLElement>(null)
  const nodeRefs = React.useRef<(HTMLSpanElement | null)[]>([])
  const reducedMotion = usePrefersReducedMotion()

  // Each node's fractional position down the section, measured so ignition
  // coincides with the tip physically crossing it (milestone bodies vary in
  // height, so index-based guesses drift).
  const [thresholds, setThresholds] = React.useState<number[] | null>(null)
  const [reached, setReached] = React.useState(0)
  // Whether the group's rail has started drawing — lights the phase chip.
  const [railLit, setRailLit] = React.useState(false)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start 0.78', 'end 0.6'],
  })
  const tipTop = useTransform(scrollYProgress, (v) => `${v * 100}%`)

  const measure = React.useCallback(() => {
    const section = sectionRef.current
    if (!section || section.offsetHeight === 0) return
    const next = nodeRefs.current.slice(0, milestones.length).map((el) => {
      if (!el) return 1
      // Walk offsetTop up to the section instead of using bounding rects:
      // offset coordinates ignore transforms, so the entrance translateY on
      // the .rise wrapper (still applied when this runs on mount) can't bias
      // the thresholds and make every node ignite late.
      let top = el.offsetTop + el.offsetHeight / 2
      let parent = el.offsetParent as HTMLElement | null
      while (parent && parent !== section) {
        top += parent.offsetTop
        parent = parent.offsetParent as HTMLElement | null
      }
      return top / section.offsetHeight
    })
    setThresholds((prev) =>
      prev && prev.length === next.length && prev.every((t, i) => t === next[i])
        ? prev
        : next
    )
    // Seed from the current scroll position so a mid-page landing lights the
    // nodes and chip the tip already sits below, without waiting for a scroll.
    const v = scrollYProgress.get()
    setReached(next.filter((t) => v >= t).length)
    setRailLit(v > 0.02)
  }, [scrollYProgress, milestones.length])

  React.useEffect(() => {
    if (reducedMotion) return
    measure()
    if (typeof ResizeObserver === 'undefined' || !sectionRef.current) return
    const ro = new ResizeObserver(measure)
    ro.observe(sectionRef.current)
    return () => ro.disconnect()
  }, [measure, reducedMotion])

  // How many nodes the tip has passed — bidirectional, so scrolling back up
  // retracts the fill and un-lights nodes in step with it.
  const syncReached = React.useCallback(
    (v: number) => {
      setRailLit((prev) => {
        const lit = v > 0.02
        return prev === lit ? prev : lit
      })
      if (!thresholds) return
      const n = thresholds.filter((t) => v >= t).length
      setReached((prev) => (prev === n ? prev : n))
    },
    [thresholds]
  )
  useMotionValueEvent(scrollYProgress, 'change', syncReached)

  return (
    <section ref={sectionRef} className="relative pl-8 sm:pl-10">
      {/* rail: muted track + scroll-drawn tone fill + traveling tip */}
      {reducedMotion ? (
        <span
          aria-hidden
          className={`absolute bottom-0 left-0 top-0 w-0.5 rounded ${TONE[tone].fill}`}
        />
      ) : (
        <>
          <span
            aria-hidden
            className="absolute bottom-0 left-0 top-0 w-0.5 rounded bg-slate-200 dark:bg-slate-800"
          />
          <motion.span
            aria-hidden
            className={`absolute bottom-0 left-0 top-0 w-0.5 origin-top rounded ${TONE[tone].fill}`}
            style={{ scaleY: scrollYProgress }}
          />
          <motion.span
            aria-hidden
            className={`absolute -left-[3px] size-2 rounded-full ${TONE[tone].fill}`}
            style={{
              top: tipTop,
              boxShadow: `0 0 10px 2px color-mix(in srgb, ${TONE[tone].glow} 60%, transparent)`,
            }}
          />
        </>
      )}

      <div className="pb-8">
        <span
          className={`inline-block rounded-full px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors duration-300 ${
            reducedMotion || tone === 'now' || railLit
              ? LABEL_TONE_LIT[tone]
              : LABEL_TONE_IDLE[tone]
          }`}
        >
          {label}
        </span>
      </div>

      {milestones.map((m, i) => (
        <div
          key={m.title}
          className={styles.rise}
          style={{ animationDelay: `${i * 90}ms` }}
        >
          <TimelineMilestone
            milestone={m}
            tone={tone}
            animate={!reducedMotion}
            active={i < reached}
            nodeRef={(el) => {
              nodeRefs.current[i] = el
            }}
          />
        </div>
      ))}
    </section>
  )
}

function RailGroup(props: {
  label: string
  milestones: RoadmapMilestone[]
  tone: Tone
}) {
  if (props.milestones.length === 0) return null
  return <RailGroupInner {...props} />
}

export function BoardLinkChip() {
  const t = useTranslations('roadmap.board')

  return (
    <a
      href={PROJECT_BOARD_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      {t('link')}
      <span aria-hidden>&#8599;</span>
    </a>
  )
}

export function RoadmapTimeline({ data }: { data: RoadmapData }) {
  const t = useTranslations('roadmap.timeline')
  const hasContent =
    data.active.length > 0 || data.upcoming.length > 0 || data.shipped.length > 0

  if (!hasContent) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        {t('empty')}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-xs text-muted-foreground">
        {t('externalContentNotice')}
      </p>
      <RailGroup label={t('phases.now')} milestones={data.active} tone="now" />
      <RailGroup label={t('phases.next')} milestones={data.upcoming} tone="next" />
      <RailGroup label={t('phases.shipped')} milestones={data.shipped} tone="shipped" />
    </div>
  )
}
