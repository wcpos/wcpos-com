'use client'

import * as React from 'react'
import { animate, type MotionValue } from 'motion/react'

/**
 * Scroll gravity for the pinned story (owner ask: completed acts should
 * carry more weight than transitions). When scrolling comes to rest within
 * the catch radius of an act's hold plateau, the last stretch eases to the
 * plateau — the classic scrollytelling "settle assist" (GSAP ScrollTrigger
 * calls it snap; CSS proximity snapping is the platform cousin, but its
 * radius isn't tunable). Any user input cancels immediately; reduced motion
 * disables it entirely.
 */

/** Progress positions where each act sits fully composed (see keyframes.ts:
 * act 2 holds 0.32–0.44, act 3 holds 0.58–0.7, act 4 settles ≥0.92). Act 1
 * is the top of the page, which has its own natural gravity. */
export const ACT_HOLDS = [0.4, 0.64, 0.95] as const

/** How far (in progress space) the pull reaches. 0.05 of a 560vh scroller
 * ≈ a fifth of a viewport — noticeable, never grabby. */
export const CATCH_RADIUS = 0.05

/** Dead zone so a settle that lands on the plateau doesn't re-trigger. */
const DEAD_ZONE = 0.004

export function nearestHold(progress: number): number | null {
  let best: number | null = null
  for (const hold of ACT_HOLDS) {
    const distance = Math.abs(progress - hold)
    if (distance >= CATCH_RADIUS || distance <= DEAD_ZONE) continue
    if (best === null || distance < Math.abs(progress - best)) best = hold
  }
  return best
}

export function useActGravity(
  scrollerRef: React.RefObject<HTMLElement | null>,
  progress: MotionValue<number>
) {
  React.useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    let animation: ReturnType<typeof animate> | null = null
    let settling = false
    let debounce: ReturnType<typeof setTimeout> | undefined

    const cancel = () => {
      animation?.stop()
      animation = null
      settling = false
    }

    const settle = () => {
      if (settling) return
      const hold = nearestHold(progress.get())
      if (hold === null) return
      const top = scroller.getBoundingClientRect().top + window.scrollY
      const target = top + hold * (scroller.offsetHeight - window.innerHeight)
      if (Math.abs(target - window.scrollY) < 2) return
      settling = true
      animation = animate(window.scrollY, target, {
        duration: 0.55,
        ease: [0.22, 0.61, 0.36, 1],
        onUpdate: (value) => window.scrollTo(0, value),
        onComplete: () => {
          // let the scroll events from our own settle drain before re-arming
          requestAnimationFrame(() => {
            settling = false
          })
        },
      })
    }

    // scrollend where available; debounced scroll as the fallback
    const hasScrollEnd = 'onscrollend' in window
    const onScrollEnd = () => {
      if (!settling) settle()
    }
    const onScroll = () => {
      if (settling) return
      clearTimeout(debounce)
      debounce = setTimeout(settle, 140)
    }
    if (hasScrollEnd) window.addEventListener('scrollend', onScrollEnd)
    else window.addEventListener('scroll', onScroll, { passive: true })

    // the user always wins: any input releases the pull instantly
    const onInput = () => cancel()
    window.addEventListener('wheel', onInput, { passive: true })
    window.addEventListener('touchstart', onInput, { passive: true })
    window.addEventListener('keydown', onInput)

    return () => {
      cancel()
      clearTimeout(debounce)
      window.removeEventListener('scrollend', onScrollEnd)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('wheel', onInput)
      window.removeEventListener('touchstart', onInput)
      window.removeEventListener('keydown', onInput)
    }
  }, [scrollerRef, progress])
}
