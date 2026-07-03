'use client'

import * as React from 'react'
import { motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react'
import { cn } from '@/lib/utils'
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion'

/**
 * The "Get started" step list, drawn by scroll (movement that means
 * progress) — the downloads-page sibling of the about-page StoryTimeline. A
 * brand-red fill grows down the line track as the reader moves through the
 * steps and a glowing tip rides its end; each numbered circle starts muted and
 * lights up to the brand-red ring as the tip passes it, bidirectionally.
 * Everything stays single-accent red (the gradient is the story timeline's
 * signature). Reduced motion renders the static list with all circles lit.
 *
 * The step content itself is passed as children from the server page, so the
 * download cards and buttons stay server-rendered.
 */

const StepsContext = React.createContext<{
  animate: boolean
  /** How many circles the scroll-drawn line has passed. */
  reached: number
  register: (index: number, el: HTMLSpanElement | null) => void
} | null>(null)

export function GetStartedSteps({ children }: { children: React.ReactNode }) {
  const listRef = React.useRef<HTMLOListElement>(null)
  const trackRef = React.useRef<HTMLSpanElement>(null)
  const markerRefs = React.useRef<(HTMLSpanElement | null)[]>([])
  const reducedMotion = usePrefersReducedMotion()

  // Each circle's fractional position down the track, measured so ignition
  // coincides with the tip physically crossing it (step bodies vary in
  // height, so index-based guesses drift).
  const [thresholds, setThresholds] = React.useState<number[] | null>(null)
  const [reached, setReached] = React.useState(0)

  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ['start 0.78', 'end 0.6'],
  })
  const tipTop = useTransform(scrollYProgress, (v) => `${v * 100}%`)

  const measure = React.useCallback(() => {
    const list = listRef.current
    const track = trackRef.current
    if (!list || !track || track.offsetHeight === 0) return
    // Thresholds live in the track's coordinate space — the same space the
    // percentage-positioned tip and the scaleY fill resolve against — so the
    // three can never drift apart.
    const next = markerRefs.current.map((el) => {
      if (!el) return 1
      let top = el.offsetTop + el.offsetHeight / 2
      let parent = el.offsetParent as HTMLElement | null
      while (parent && parent !== list) {
        top += parent.offsetTop
        parent = parent.offsetParent as HTMLElement | null
      }
      // Clamp below 1 so a circle sitting at (or past) the track end can
      // still ignite — otherwise a copy edit that shrinks the last step's
      // body would silently leave its circle unlit forever.
      return Math.min((top - track.offsetTop) / track.offsetHeight, 0.98)
    })
    setThresholds((prev) =>
      prev && prev.length === next.length && prev.every((t, i) => t === next[i])
        ? prev
        : next
    )
    // Seed the pass count from the current scroll position so circles the
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

  // How many circles the tip has passed — bidirectional, so scrolling back up
  // retracts the line and dims circles in step with it.
  const syncReached = React.useCallback(
    (v: number) => {
      if (!thresholds) return
      const n = thresholds.filter((t) => v >= t).length
      setReached((prev) => (prev === n ? prev : n))
    },
    [thresholds]
  )
  useMotionValueEvent(scrollYProgress, 'change', syncReached)

  const register = React.useCallback(
    (index: number, el: HTMLSpanElement | null) => {
      markerRefs.current[index] = el
    },
    []
  )
  const ctx = React.useMemo(
    () => ({ animate: !reducedMotion, reached, register }),
    [reducedMotion, reached, register]
  )

  return (
    <StepsContext.Provider value={ctx}>
      {/* pt-2 lets the line start above step 1's circle, so the scroll-drawn
          fill visibly arrives at it rather than starting on it */}
      <ol className="relative mx-auto mt-12 max-w-2xl space-y-10 pl-12 pt-2" ref={listRef}>
        {/* line track + scroll-drawn fill + traveling tip, centered behind
            the w-8 circles (whose centers sit 16px from the list edge) */}
        <span
          ref={trackRef}
          aria-hidden="true"
          className="absolute bottom-12 left-[15px] top-0 w-0.5"
        >
          <span className="absolute inset-0 rounded bg-border" />
          {!reducedMotion && (
            <>
              <motion.span
                className="absolute inset-0 origin-top rounded bg-wcpos-red"
                style={{ scaleY: scrollYProgress }}
              />
              <motion.span
                className="absolute -left-[3px] h-2 w-2 rounded-full bg-wcpos-red"
                style={{
                  top: tipTop,
                  boxShadow:
                    '0 0 10px 2px color-mix(in srgb, hsl(var(--wcpos-red)) 60%, transparent)',
                }}
              />
            </>
          )}
        </span>
        {children}
      </ol>
    </StepsContext.Provider>
  )
}

export function GetStartedStep({
  step,
  children,
}: {
  /** 1-based step number, shown in the circle. */
  step: number
  children: React.ReactNode
}) {
  const ctx = React.useContext(StepsContext)
  if (!ctx) throw new Error('GetStartedStep must be used within GetStartedSteps')
  const { animate, reached, register } = ctx
  const active = !animate || step - 1 < reached

  return (
    <li className="relative">
      <motion.span
        ref={(el) => register(step - 1, el)}
        className={cn(
          'absolute -left-12 top-0 flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] bg-background text-sm font-semibold',
          active
            ? 'border-wcpos-red text-wcpos-red-accent'
            : 'border-border text-muted-foreground',
          animate && 'transition-colors duration-300'
        )}
        initial={false}
        // Deliberate: on a mid-page landing the post-mount seed lights every
        // already-passed circle with one shared pulse — same flourish as the
        // about timeline's spring pop-in.
        animate={{ scale: active && animate ? [1, 1.15, 1] : 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        {step}
      </motion.span>
      {children}
    </li>
  )
}
