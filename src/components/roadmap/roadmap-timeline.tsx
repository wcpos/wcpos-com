'use client'

import * as React from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
} from 'motion/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { RoadmapData, Epic, Release } from '@/types/roadmap'
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion'
import { formatDateForLocale } from '@/lib/date-format'
import styles from './timeline.module.css'

// Release briefs come from GitHub; the train keeps the existing scroll-drawn rail.
const RELEASE_ISSUES_URL =
  'https://github.com/wcpos/roadmap/issues?q=is%3Aissue+label%3Arelease'

type Tone = 'now' | 'next' | 'later' | 'shipped'

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
  later: {
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
  later: 'border border-transparent bg-slate-500 text-white',
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
  later: 'border border-slate-300 text-muted-foreground dark:border-slate-600',
  shipped: 'border border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
}

function fmtDue(dueOn: string | null, locale: string): string | null {
  if (!dueOn) return null
  // Format GitHub dates in UTC so a
  // negative-offset server timezone can't shift them to the previous month.
  return formatDateForLocale(dueOn, locale, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function StatusGlyph({ status }: { status: Epic['state'] }) {
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

function GitHubMarkdown({ content }: { content: string }) {
  return (
    <div
      lang="en"
      className="break-words text-sm leading-relaxed text-muted-foreground [&>*+*]:mt-3 [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_pre]:overflow-x-auto"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} disallowedElements={['img']}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

function EpicProgress({ progress }: { progress: Epic['progress'] }) {
  if (!progress) return null
  return (
    <div className="mt-3 flex items-center gap-3">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-wcpos-red"
          style={{ width: `${(progress.completed / progress.total) * 100}%` }}
        />
      </div>
      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        {progress.completed}/{progress.total}
      </span>
    </div>
  )
}

function EpicList({ epics, cards = false }: { epics: Epic[]; cards?: boolean }) {
  const t = useTranslations('roadmap')
  if (!epics.length) {
    return <p className="mt-4 text-sm text-muted-foreground">{t('release.noPublicItems')}</p>
  }
  return (
    <ul
      className={cards ? 'mt-4 grid gap-4 md:grid-cols-2' : 'mt-4 divide-y divide-border/60'}
    >
      {epics.map((epic) => (
        <li
          key={epic.number}
          className={cards ? 'rounded-lg border bg-background p-5' : 'flex items-start gap-3 py-4'}
        >
          {cards ? (
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs text-muted-foreground">
              <StatusGlyph status={epic.state} />
              {t(`status.${epic.state === 'in_progress' ? 'inProgress' : epic.state}`)}
            </span>
          ) : (
            <StatusGlyph status={epic.state} />
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <a
              href={epic.url}
              lang="en"
              className="break-words font-medium hover:text-wcpos-red-accent"
            >
              {epic.title}
            </a>
            <GitHubMarkdown content={epic.summary} />
            <EpicProgress progress={epic.progress} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function ReleaseDate({
  release,
  shipped = false,
}: {
  release: Release
  shipped?: boolean
}) {
  const t = useTranslations('roadmap.release')
  const locale = useLocale()
  const date = fmtDue(shipped ? release.shippedOn : release.dueOn, locale)
  return (
    <p className="mt-2 font-mono text-xs text-muted-foreground">
      {date ? t(shipped ? 'shippedOn' : 'due', { date }) : t('noDate')}
    </p>
  )
}

function ReleaseBrief({
  release,
  hero = false,
}: {
  release: Release
  hero?: boolean
}) {
  const t = useTranslations('roadmap.release')
  return (
    <>
      {/* A brief section renders only when the release issue filled it in; an
          empty heading would read as a gap in the brief rather than a choice. */}
      <div
        className={hero ? 'mt-8 grid gap-6 md:grid-cols-[1.6fr_1fr]' : 'mt-5 space-y-5'}
      >
        {release.why && (
          <div className="min-w-0 space-y-2">
            <h3 className="font-semibold">{t('whyTitle')}</h3>
            <GitHubMarkdown content={release.why} />
          </div>
        )}
        {release.notInRelease && (
          <div className="min-w-0 space-y-2">
            <h3 className="font-semibold">{t('notInTitle')}</h3>
            <GitHubMarkdown content={release.notInRelease} />
          </div>
        )}
      </div>
      {release.prose && (
        <div className="mt-6"><GitHubMarkdown content={release.prose} /></div>
      )}
    </>
  )
}

function ReleaseHero({ release }: { release: Release }) {
  const t = useTranslations('roadmap')
  const completed = release.epics.filter((epic) => epic.state === 'done').length
  return (
    <section className="mb-12 w-full rounded-b-xl border-t-2 border-wcpos-red bg-muted/30 p-6 sm:p-8">
      <span
        className={`inline-block rounded-full px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] ${LABEL_TONE_LIT.now}`}
      >
        {t('timeline.phases.now')}
      </span>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <a href={release.url} className="font-mono text-wcpos-red-accent">
            {release.version}
          </a>
          <h2
            lang="en"
            className="mt-2 break-words text-4xl font-semibold tracking-tight sm:text-5xl"
          >
            {release.theme}
          </h2>
          <ReleaseDate release={release} />
        </div>
        <div className="text-right">
          <div className="font-mono text-5xl tabular-nums tracking-tighter">
            {completed} / {release.epics.length}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('release.epicsDoneLabel')}
          </p>
        </div>
      </div>
      <ReleaseBrief release={release} hero />
      <h3 className="mt-8 text-xl font-semibold">
        {t('release.inside', { version: release.version })}
      </h3>
      <EpicList epics={release.epics} cards />
    </section>
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

function TimelineRelease({
  release,
  tone,
  animate,
  active,
  nodeRef,
}: {
  release: Release
  tone: Tone
  animate: boolean
  active: boolean
  nodeRef: (el: HTMLSpanElement | null) => void
}) {
  const t = useTranslations('roadmap.release')
  const completed = release.epics.filter((epic) => epic.state === 'done').length
  return (
    <div className={tone === 'shipped' ? 'relative pb-14 opacity-60' : 'relative pb-14'}>
      <TimelineNode tone={tone} animate={animate} active={active} nodeRef={nodeRef} />
      <h2
        lang="en"
        className="break-words text-2xl font-semibold tracking-tight sm:text-3xl"
      >
        <a href={release.url} className="hover:text-wcpos-red-accent">
          {release.version} — {release.theme}
        </a>
      </h2>
      <ReleaseDate release={release} shipped={tone === 'shipped'} />
      <p className="mt-2 text-sm text-muted-foreground">
        {t('epicsDone', { completed, total: release.epics.length })}
      </p>
      <ReleaseBrief release={release} />
      <EpicList epics={release.epics} />
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
  releases,
  tone,
}: {
  label: string
  releases: Release[]
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
  const railFill =
    tone === 'later'
      ? `border-l-2 border-dotted ${TONE.later.ring}`
      : TONE[tone].fill
  const tipTop = useTransform(scrollYProgress, (v) => `${v * 100}%`)

  const measure = React.useCallback(() => {
    const section = sectionRef.current
    if (!section || section.offsetHeight === 0) return
    const next = nodeRefs.current.slice(0, releases.length).map((el) => {
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
  }, [scrollYProgress, releases.length])

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
          className={`absolute bottom-0 left-0 top-0 w-0.5 rounded ${railFill}`}
        />
      ) : (
        <>
          <span
            aria-hidden
            className={`absolute bottom-0 left-0 top-0 w-0.5 rounded ${
              tone === 'later' ? `${railFill} opacity-30` : 'bg-slate-200 dark:bg-slate-800'
            }`}
          />
          <motion.span
            aria-hidden
            className={`absolute bottom-0 left-0 top-0 w-0.5 origin-top rounded ${railFill}`}
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

      {releases.map((m, i) => (
        <div
          key={m.url}
          className={styles.rise}
          style={{ animationDelay: `${i * 90}ms` }}
        >
          <TimelineRelease
            release={m}
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
  releases: Release[]
  tone: Tone
}) {
  if (props.releases.length === 0) return null
  return <RailGroupInner {...props} />
}

export function BoardLinkChip() {
  const t = useTranslations('roadmap.board')

  return (
    <a
      href={RELEASE_ISSUES_URL}
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
    data.now ||
    data.next.length > 0 || data.later.length > 0 || data.shipped.length > 0

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
      {data.now && <ReleaseHero release={data.now} />}
      <RailGroup label={t('phases.next')} releases={data.next} tone="next" />
      <RailGroup label={t('phases.later')} releases={data.later} tone="later" />
      <RailGroup label={t('phases.shipped')} releases={data.shipped} tone="shipped" />
    </div>
  )
}
