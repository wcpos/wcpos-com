'use client'

import * as React from 'react'
import {
  motion,
  transform,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from 'motion/react'
import { Section, Container } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'

const milestones = [
  {
    date: 'December 2011',
    title: 'Urban Locavore opens',
    body: 'A small food store in Perth, with hundreds of products already in WooCommerce — and no way to sell them at the counter.',
  },
  {
    date: '2011 – 2014',
    title: 'A register, built out of necessity',
    body: 'With nothing on the market that fit, Paul built a point of sale for his own shop — Backbone.js and an in-browser IndexedDB database, on top of the store he already ran online.',
  },
  {
    date: 'April 2014',
    title: 'The shop closes',
    body: 'Urban Locavore winds down — but the register it ran on still works, and other WooCommerce stores need the same thing.',
  },
  {
    date: '11 May 2014',
    title: 'Released on WordPress.org',
    body: 'WCPOS goes public, free for anyone who needs it. The free version does the actual job: sell, print, stay in sync.',
  },
  {
    date: '4 May 2023',
    title: 'Rewritten in React Native',
    body: 'Four years of rebuilding from scratch land as v1.0.0: one codebase for every screen. The desktop app ships the same day — phones and tablets are next.',
  },
  {
    date: 'December 2025',
    title: 'Native mobile apps',
    body: 'The React Native bet pays off: WCPOS arrives on iOS and Android in open beta — the same register, now on the hardware already in the shop.',
  },
  {
    date: 'Today',
    title: 'Still shipping',
    body: 'More than a decade on. One developer, funded by Pro, still releasing — and the free version is still the real thing.',
  },
]

/**
 * The colours the scroll-drawn line passes through, top to bottom. Shared by
 * the line fill, the traveling tip, and the milestone markers the tip ignites,
 * so the three can never drift apart. First stop mirrors --wcpos-red
 * (hsl(4 73% 47%)) as a literal because motion interpolates colours in JS.
 */
const LINE_STOPS = ['#cf2c20', '#5b8def', '#8b5cf6']
const colorAlongLine = transform([0, 0.5, 1], LINE_STOPS)

function usePrefersReducedMotion() {
  return React.useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () =>
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false
  )
}

function Milestone({
  date,
  title,
  body,
  animate,
  active,
  accent,
  markerRef,
}: (typeof milestones)[number] & {
  animate: boolean
  /** Whether the scroll-drawn line has reached this milestone. */
  active: boolean
  /** The line's colour where it crosses this marker. */
  accent: string
  markerRef: (el: HTMLSpanElement | null) => void
}) {
  const marker = animate ? (
    <span
      ref={markerRef}
      aria-hidden="true"
      className="absolute -left-[31px] mt-1.5 h-3 w-3"
    >
      {/* hollow ring, waiting for the line to arrive */}
      <span className="absolute inset-0 rounded-full border-2 border-slate-300 bg-background dark:border-slate-700" />
      {/* fill that pops in when the traveling tip passes this point */}
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: accent }}
        initial={false}
        animate={{ scale: active ? 1 : 0, opacity: active ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      />
    </span>
  ) : (
    <span
      aria-hidden="true"
      className="absolute -left-[31px] mt-1.5 h-3 w-3 rounded-full bg-wcpos-red"
    />
  )

  const content = (
    <>
      {marker}
      <p className="text-sm font-medium text-wcpos-red">{date}</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-400">
        {body}
      </p>
    </>
  )

  if (!animate) {
    return <li className="relative mb-10 ml-6 last:mb-0">{content}</li>
  }
  return (
    <motion.li
      className="relative mb-10 ml-6 last:mb-0"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px -12% 0px' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      {content}
    </motion.li>
  )
}

/**
 * The company timeline, drawn by scroll (ADR 0013: movement that means
 * progress). A gradient fill grows down the line track as the reader moves
 * through the story and a glowing tip rides its end, taking on the gradient's
 * colour as it goes. Milestone markers start as hollow rings and are ignited
 * by the tip as it passes — one moving element, one activation system, so the
 * markers never compete with the traveling animation. Reduced motion renders
 * the static timeline with solid markers.
 */
export function StoryTimeline() {
  const listRef = React.useRef<HTMLOListElement>(null)
  const markerRefs = React.useRef<(HTMLSpanElement | null)[]>([])
  const reducedMotion = usePrefersReducedMotion()

  // Each marker's fractional position down the list, measured so activation
  // coincides with the tip physically crossing it (text blocks vary in
  // height, so index-based guesses drift).
  const [thresholds, setThresholds] = React.useState<number[] | null>(null)
  const [reached, setReached] = React.useState(0)

  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ['start 0.78', 'end 0.6'],
  })
  const tipTop = useTransform(scrollYProgress, (v) => `${v * 100}%`)
  const tipColor = useTransform(scrollYProgress, [0, 0.5, 1], LINE_STOPS)
  const tipGlow = useTransform(
    tipColor,
    (c) => `0 0 10px 2px color-mix(in srgb, ${c} 60%, transparent)`
  )

  const measure = React.useCallback(() => {
    const list = listRef.current
    if (!list) return
    const listRect = list.getBoundingClientRect()
    if (listRect.height === 0) return
    const next = markerRefs.current.slice(0, milestones.length).map((el) => {
      if (!el) return 1
      const r = el.getBoundingClientRect()
      return (r.top + r.height / 2 - listRect.top) / listRect.height
    })
    setThresholds((prev) =>
      prev && prev.length === next.length && prev.every((t, i) => t === next[i])
        ? prev
        : next
    )
    // Seed the pass count from the current scroll position so markers the
    // tip already sits below are lit without waiting for a scroll event.
    const v = scrollYProgress.get()
    setReached(next.filter((t) => v >= t).length)
  }, [scrollYProgress])

  React.useEffect(() => {
    if (reducedMotion) return
    measure()
    if (typeof ResizeObserver === 'undefined' || !listRef.current) return
    const ro = new ResizeObserver(measure)
    ro.observe(listRef.current)
    return () => ro.disconnect()
  }, [measure, reducedMotion])

  // How many markers the tip has passed — bidirectional, so scrolling back up
  // retracts the line and un-fills markers in step with it.
  const syncReached = React.useCallback(
    (v: number) => {
      if (!thresholds) return
      const n = thresholds.filter((t) => v >= t).length
      setReached((prev) => (prev === n ? prev : n))
    },
    [thresholds]
  )
  useMotionValueEvent(scrollYProgress, 'change', syncReached)

  return (
    <Section tone="default" spacing="default" bare>
      <Container width="prose">
        <SectionHeading
          className="mb-12"
          title="How it started, and why it's still here"
        />

        <ol ref={listRef} className="relative">
          {/* line track + scroll-drawn fill + traveling tip */}
          <span
            aria-hidden="true"
            className="absolute bottom-1 left-0 top-1 w-0.5 rounded bg-slate-200 dark:bg-slate-800"
          />
          {!reducedMotion && (
            <>
              <motion.span
                aria-hidden="true"
                className="absolute bottom-1 left-0 top-1 w-0.5 origin-top rounded"
                style={{
                  scaleY: scrollYProgress,
                  backgroundImage: `linear-gradient(to bottom, ${LINE_STOPS.join(', ')})`,
                }}
              />
              <motion.span
                aria-hidden="true"
                className="absolute -left-[3px] h-2 w-2 rounded-full"
                style={{
                  top: tipTop,
                  backgroundColor: tipColor,
                  boxShadow: tipGlow,
                }}
              />
            </>
          )}
          {milestones.map((m, i) => (
            <Milestone
              key={m.date}
              {...m}
              animate={!reducedMotion}
              active={i < reached}
              accent={colorAlongLine(
                thresholds?.[i] ?? i / (milestones.length - 1)
              )}
              markerRef={(el) => {
                markerRefs.current[i] = el
              }}
            />
          ))}
        </ol>
      </Container>
    </Section>
  )
}
