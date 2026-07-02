'use client'

import * as React from 'react'
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from 'motion/react'
import { cn } from '@/lib/utils'
import { CounterProps } from './acts/counter-props'
import { CloudSync } from './acts/cloud-sync'
import {
  CopyAct1,
  CopyAct2,
  CopyAct3,
  CopyAct4,
} from './acts/story-copy-blocks'
import {
  DeviceLaptop,
  DevicePhone,
  DevicePrinter,
  DeviceScanner,
  DeviceTablet,
  DeviceTerminal,
} from './devices'
import { K, ACT_BOUNDS, type Track } from './keyframes'
import { StoryStatic } from './story-static'
import styles from './story.module.css'

function useTrack(
  progress: MotionValue<number>,
  track: Track,
  unit?: 'vw' | 'vh'
): MotionValue<number | string> {
  const value = useTransform(progress, [...track[0]], [...track[1]])
  return useTransform(value, (v) => (unit ? `${v}${unit}` : v))
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Local media-query hook (instead of motion's useReducedMotion, which caches
 * the query result in module state). Server snapshot is `false` so SSR emits
 * the pinned markup; reduced-motion users swap to the static variant on
 * hydration.
 */
function usePrefersReducedMotion() {
  return React.useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(REDUCED_MOTION_QUERY)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false
  )
}

/**
 * The four-act pinned scroll story. Desktop (md+) gets the scrubbed
 * choreography; small viewports and prefers-reduced-motion get the static
 * stacked variant with identical copy (see StoryStatic). Both variants are
 * in the DOM, switched by CSS, so SSR needs no viewport knowledge.
 */
export function ScrollStory() {
  return (
    <>
      <div className="hidden md:block">
        <PinnedStory />
      </div>
      <div className="md:hidden">
        <StoryStatic />
      </div>
    </>
  )
}

function PinnedStory() {
  const reducedMotion = usePrefersReducedMotion()
  if (reducedMotion) {
    return <StoryStatic />
  }
  return <PinnedStoryScroller />
}

function PinnedStoryScroller() {
  const scrollerRef = React.useRef<HTMLDivElement>(null)
  const { scrollYProgress: progress } = useScroll({
    target: scrollerRef,
    offset: ['start start', 'end end'],
  })

  const [act, setAct] = React.useState(0)
  useMotionValueEvent(progress, 'change', (p) => {
    const next = ACT_BOUNDS.filter((bound) => p >= bound).length
    setAct((current) => (current === next ? current : next))
  })

  // backgrounds
  const bgWarmOpacity = useTrack(progress, K.bgWarmOpacity)
  const bgWarmScale = useTrack(progress, K.bgWarmScale)
  const bgSlateOpacity = useTrack(progress, K.bgSlateOpacity)

  // counter props
  const propsOpacity = useTrack(progress, K.propsOpacity)
  const propsY = useTrack(progress, K.propsY, 'vh')
  const propsScale = useTrack(progress, K.propsScale)

  // tablet
  const tabletRotateX = useTrack(progress, K.tabletRotateX)
  const tabletRotateZ = useTrack(progress, K.tabletRotateZ)
  const tabletScale = useTrack(progress, K.tabletScale)
  const tabletX = useTrack(progress, K.tabletX, 'vw')
  const tabletY = useTrack(progress, K.tabletY, 'vh')

  // act 2 companions
  const phoneOpacity = useTrack(progress, K.phoneOpacity)
  const phoneX = useTrack(progress, K.phoneX, 'vw')
  const laptopOpacity = useTrack(progress, K.laptopOpacity)
  const laptopX = useTrack(progress, K.laptopX, 'vw')

  // act 3 hardware
  const terminalOpacity = useTrack(progress, K.terminalOpacity)
  const terminalX = useTrack(progress, K.terminalX, 'vw')
  const printerOpacity = useTrack(progress, K.printerOpacity)
  const printerX = useTrack(progress, K.printerX, 'vw')
  const printerY = useTrack(progress, K.printerY, 'vh')
  const scannerOpacity = useTrack(progress, K.scannerOpacity)
  const scannerX = useTrack(progress, K.scannerX, 'vw')
  const scannerY = useTrack(progress, K.scannerY, 'vh')

  // act 4 cloud
  const cloudOpacity = useTrack(progress, K.cloudOpacity)
  const cloudY = useTrack(progress, K.cloudY, 'vh')

  // copy + hint
  const copy1Opacity = useTrack(progress, K.copy1Opacity)
  const copy2Opacity = useTrack(progress, K.copy2Opacity)
  const copy3Opacity = useTrack(progress, K.copy3Opacity)
  const copy4Opacity = useTrack(progress, K.copy4Opacity)
  const hintOpacity = useTrack(progress, K.hintOpacity)

  return (
    <div ref={scrollerRef} className="relative h-[560vh]" data-testid="story-scroller">
      <div className="sticky top-0 h-screen overflow-hidden bg-slate-950">
        {/* backgrounds: warm counter → slate studio */}
        <motion.div
          aria-hidden="true"
          className={cn('absolute inset-0', styles.woodCounter)}
          style={{ opacity: bgWarmOpacity, scale: bgWarmScale }}
        >
          <div className={cn('absolute -inset-[30%]', styles.lightPool)} />
          <div className={cn('absolute inset-0', styles.woodVignette)} />
        </motion.div>
        <motion.div
          aria-hidden="true"
          className={cn('absolute inset-0', styles.slateStudio)}
          style={{ opacity: bgSlateOpacity }}
        >
          <div className={cn('absolute inset-0', styles.gridlines)} />
        </motion.div>

        {/* act 1 counter dressing */}
        <motion.div
          className="absolute inset-0"
          style={{ opacity: propsOpacity, y: propsY, scale: propsScale }}
        >
          <CounterProps />
        </motion.div>

        {/* the tablet — one element across all four acts */}
        <div className="absolute left-1/2 top-1/2 z-10 [perspective:1200px]">
          <motion.div
            className="-ml-[230px] -mt-[159px] [transform-style:preserve-3d]"
            style={{
              x: tabletX,
              y: tabletY,
              rotateX: tabletRotateX,
              rotateZ: tabletRotateZ,
              scale: tabletScale,
            }}
          >
            <div className={styles.bob}>
              <DeviceTablet />
            </div>
          </motion.div>
        </div>

        {/* act 2: laptop behind the tablet, phone in front (device cluster) */}
        <div className="absolute left-1/2 top-1/2 z-[9]">
          <motion.div
            className="-ml-[210px] -mt-[132px]"
            style={{ opacity: laptopOpacity, x: laptopX, y: '4vh' }}
          >
            <DeviceLaptop />
          </motion.div>
        </div>
        <div className="absolute left-1/2 top-1/2 z-[11]">
          <motion.div
            className="-ml-16 -mt-[129px]"
            style={{ opacity: phoneOpacity, x: phoneX, y: '6vh' }}
          >
            <DevicePhone />
          </motion.div>
        </div>

        {/* act 3: terminal fronts the tablet (payment moment); printer + scanner behind */}
        <div className="absolute left-1/2 top-1/2 z-[11]">
          <motion.div
            className="-ml-[75px] -mt-28"
            style={{ opacity: terminalOpacity, x: terminalX, y: '2vh' }}
          >
            <DeviceTerminal />
          </motion.div>
        </div>
        <div className="absolute left-1/2 top-1/2 z-[9]">
          <motion.div
            className="-ml-[105px] -mt-[74px]"
            style={{ opacity: printerOpacity, x: printerX, y: printerY }}
          >
            <DevicePrinter />
          </motion.div>
          <motion.div
            className="-ml-[60px] -mt-[95px]"
            style={{ opacity: scannerOpacity, x: scannerX, y: scannerY }}
          >
            <DeviceScanner />
          </motion.div>
        </div>

        {/* act 4: cloud sync */}
        <div className="absolute left-1/2 top-1/2 z-[8]">
          <motion.div
            className="-ml-[280px] -mt-[290px]"
            style={{ opacity: cloudOpacity, x: '10vw', y: cloudY }}
          >
            <CloudSync />
          </motion.div>
        </div>

        {/* copy overlays */}
        <motion.div
          className="absolute left-1/2 top-[10%] z-20 w-full max-w-2xl -translate-x-1/2 text-center"
          style={{ opacity: copy1Opacity }}
        >
          <CopyAct1 />
        </motion.div>
        <motion.div
          className="pointer-events-none absolute left-[6%] top-1/2 z-20 max-w-sm -translate-y-1/2"
          style={{ opacity: copy2Opacity }}
        >
          <CopyAct2 />
        </motion.div>
        <motion.div
          className="pointer-events-none absolute left-[6%] top-1/2 z-20 max-w-sm -translate-y-1/2"
          style={{ opacity: copy3Opacity }}
        >
          <CopyAct3 />
        </motion.div>
        <motion.div
          className="pointer-events-none absolute left-[6%] top-1/2 z-20 max-w-sm -translate-y-1/2"
          style={{ opacity: copy4Opacity }}
        >
          <CopyAct4 />
        </motion.div>

        {/* scroll hint */}
        <motion.div
          aria-hidden="true"
          className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full bg-slate-950/60 px-4 py-1.5 text-[11px] uppercase tracking-[0.14em] text-slate-400"
          style={{ opacity: hintOpacity }}
        >
          Scroll ↓
        </motion.div>

        {/* act progress dots */}
        <div
          aria-hidden="true"
          className="absolute right-6 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2.5"
        >
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn(
                'h-2 w-2 rounded-full transition-all duration-300',
                i === act ? 'scale-125 bg-wcpos-red' : 'bg-slate-600'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
