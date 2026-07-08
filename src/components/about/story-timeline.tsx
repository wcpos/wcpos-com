'use client'

import * as React from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
  motion,
  transform,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from 'motion/react'
import { Section, Container } from '@/components/ui/section'
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion'
import { SectionHeading } from '@/components/ui/section-heading'
import { formatDateForLocale } from '@/lib/date-format'

const milestones = [
  {
    id: 'm1',
    date: { type: 'month', value: '2011-12-01T00:00:00Z' },
  },
  {
    id: 'm2',
    date: { type: 'range', start: 2011, end: 2014 },
  },
  {
    id: 'm3',
    date: { type: 'month', value: '2014-04-01T00:00:00Z' },
  },
  {
    id: 'm4',
    date: { type: 'day', value: '2014-05-11T00:00:00Z' },
  },
  {
    id: 'm5',
    date: { type: 'day', value: '2023-05-04T00:00:00Z' },
  },
  {
    id: 'm6',
    date: { type: 'month', value: '2025-12-01T00:00:00Z' },
  },
  {
    id: 'm7',
    date: { type: 'today' },
  },
] as const

function formatTimelineDate(
  date: (typeof milestones)[number]['date'],
  locale: string,
  t: (key: 'today' | 'range', values?: { start: number; end: number }) => string
): string {
  if (date.type === 'today') return t('today')
  if (date.type === 'range') {
    return t('range', { start: date.start, end: date.end })
  }
  return formatDateForLocale(date.value, locale, {
    day: date.type === 'day' ? 'numeric' : undefined,
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * The colours the scroll-drawn line passes through, top to bottom. Shared by
 * the line fill, the traveling tip, and the milestone markers the tip ignites,
 * so the three can never drift apart. First stop mirrors --wcpos-red
 * (hsl(4 73% 47%)) as a literal because motion interpolates colours in JS.
 */
const LINE_STOPS = ['#cf2c20', '#5b8def', '#8b5cf6']
const colorAlongLine = transform([0, 0.5, 1], LINE_STOPS)

/**
 * Motion mixes colours in squared-RGB space while CSS gradients interpolate
 * raw sRGB, so a plain 3-stop gradient would drift from the JS-derived tip
 * and marker colours between stops. Sampling colorAlongLine densely keeps
 * the CSS line on motion's curve.
 */
const LINE_GRADIENT = `linear-gradient(to bottom, ${[0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1]
  .map((t) => `${colorAlongLine(t)} ${t * 100}%`)
  .join(', ')})`

function Milestone({
  date,
  title,
  body,
  animate,
  active,
  accent,
  markerRef,
}: {
  date: string
  title: string
  body: string
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
      className="absolute -left-[29px] mt-1.5 h-3 w-3"
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
      className="absolute -left-[29px] mt-1.5 h-3 w-3 rounded-full bg-wcpos-red"
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
  const locale = useLocale()
  const t = useTranslations('about.timeline')
  const dateT = useTranslations('about.timeline.dates')
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
    if (!list || list.offsetHeight === 0) return
    const next = markerRefs.current.slice(0, milestones.length).map((el) => {
      if (!el) return 1
      // Walk offsetTop up to the list instead of using bounding rects:
      // offset coordinates ignore transforms, so the entrance translateY on
      // motion.li (still applied when this runs on mount) can't bias the
      // thresholds and make every marker ignite late.
      let top = el.offsetTop + el.offsetHeight / 2
      let parent = el.offsetParent as HTMLElement | null
      while (parent && parent !== list) {
        top += parent.offsetTop
        parent = parent.offsetParent as HTMLElement | null
      }
      return top / list.offsetHeight
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
          title={t('heading')}
        />

        {/* pt-4 lets the line start above the first marker, so the
            scroll-drawn fill visibly arrives at it rather than starting on it */}
        <ol ref={listRef} className="relative pt-4">
          {/* line track + scroll-drawn fill + traveling tip */}
          <span
            aria-hidden="true"
            className="absolute bottom-1 left-0 top-0 w-0.5 rounded bg-slate-200 dark:bg-slate-800"
          />
          {!reducedMotion && (
            <>
              <motion.span
                aria-hidden="true"
                className="absolute bottom-1 left-0 top-0 w-0.5 origin-top rounded"
                style={{
                  scaleY: scrollYProgress,
                  backgroundImage: LINE_GRADIENT,
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
              key={m.id}
              date={formatTimelineDate(m.date, locale, dateT)}
              title={t(`items.${m.id}.title`)}
              body={t(`items.${m.id}.body`)}
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
