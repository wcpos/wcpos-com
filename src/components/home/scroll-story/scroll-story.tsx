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
import { ACT_HOLDS, useActGravity } from './act-gravity'
import { CloudSync } from './acts/cloud-sync'
import { CyclingDevice } from './acts/cycling-device'
import { DotOrbit } from './acts/dot-orbit'
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
const COPY_1_HIDDEN_PROGRESS = K.copy1Opacity[0][2]

/**
 * The Act-1 counter photograph and where its tablet's body sits inside it
 * (image-pixel coords, measured off the render). While the story holds on
 * the counter the DOM tablet pins onto this quad so the live PosScreen
 * reads as the photographed tablet's display; the existing swing-up path
 * (0.13→0.30) then lifts it out of the photo. Position/scale depend on the
 * viewport (the photo renders with object-cover); the foreshortening does
 * not, so the pinned rotateX is a constant.
 */
const COUNTER_PHOTO = {
  width: 1376,
  height: 768,
  // width is the tablet body trapezoid's mid-line (top edge wider than
  // bottom) — with per-element perspective the projected mid-line width is
  // exact. Coordinates are in the source image's pixel space; the shipped
  // asset only needs the same aspect ratio.
  tablet: { cx: 559, cy: 536, width: 297, height: 165 },
} as const

/** DeviceTablet's unscaled CSS box (see devices/tablet.tsx). */
const TABLET_BODY = { width: 460, height: 318 } as const

/** acos of the photo tablet's foreshortening ratio; negative = top edge toward camera. */
const PIN_ROTATE_X = -(
  (Math.acos(
    (COUNTER_PHOTO.tablet.height * TABLET_BODY.width) /
      (COUNTER_PHOTO.tablet.width * TABLET_BODY.height)
  ) *
    180) /
  Math.PI
)

type StageSize = { width: number; height: number }
type TabletPin = { x: number; y: number; scale: number }

/** Where the photo tablet's center lands inside the object-cover'd stage, px. */
function computeTabletPin(stage: StageSize): TabletPin {
  const s = Math.max(
    stage.width / COUNTER_PHOTO.width,
    stage.height / COUNTER_PHOTO.height
  )
  const cx =
    (stage.width - COUNTER_PHOTO.width * s) / 2 + COUNTER_PHOTO.tablet.cx * s
  const cy =
    (stage.height - COUNTER_PHOTO.height * s) / 2 + COUNTER_PHOTO.tablet.cy * s
  return {
    x: cx - stage.width / 2, // px from stage center
    y: cy - stage.height / 2, // px from stage center
    scale: (COUNTER_PHOTO.tablet.width * s) / TABLET_BODY.width,
  }
}

/**
 * Rendered size of the sticky stage, via ResizeObserver. window.inner* is
 * unreliable here (emulated viewports report stale/zero sizes at mount);
 * observing the element that actually hosts the photo cannot drift.
 */
function useStageSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = React.useState<StageSize | null>(null)
  React.useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setSize({ width, height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return size
}

/**
 * K.tablet* with the counter-hold stops replaced by the measured pin, and
 * all x/y values resolved to px against the measured stage (single unit —
 * mixing the pin's px with the flight path's vw/vh caused drift).
 */
type TabletTracks = {
  rotateX: Track
  rotateZ: Track
  scale: Track
  x: Track
  y: Track
  /** true once x/y values are px resolved against the measured stage */
  px: boolean
}

function pinnedTabletTracks(size: StageSize | null): TabletTracks {
  if (!size) {
    return {
      rotateX: K.tabletRotateX,
      rotateZ: K.tabletRotateZ,
      scale: K.tabletScale,
      x: K.tabletX,
      y: K.tabletY,
      px: false,
    }
  }
  const pin = computeTabletPin(size)
  const vw = (v: number) => (v / 100) * size.width
  const vh = (v: number) => (v / 100) * size.height
  return {
    rotateX: [
      [0, 0.13, 0.3, 1],
      [PIN_ROTATE_X, PIN_ROTATE_X, 0, 0],
    ],
    rotateZ: [
      [0, 0.3, 1],
      [0, 0, 0],
    ],
    scale: [
      [0, 0.13, 0.3, 0.42, 0.55, 0.68, 0.82, 1],
      [pin.scale, pin.scale, 1.08, 1.08, 0.94, 0.94, 0.78, 0.78],
    ],
    x: [
      [0, 0.16, 0.32, 0.44, 0.56, 0.7, 0.84, 1],
      [pin.x, pin.x, vw(12), vw(12), vw(9), vw(9), vw(10), vw(10)],
    ],
    y: [
      [0, 0.13, 0.3, 0.68, 0.84, 1],
      [pin.y, pin.y, 0, 0, vh(16), vh(16)],
    ],
    px: true,
  }
}

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
 * in the DOM, switched by CSS, so SSR needs no viewport knowledge and the
 * desktop hero paints before hydration. Image downloads are gated at the
 * markup level instead: the pinned picture's desktop sources carry a
 * min-width media query and its mobile fallback src is the static card's
 * url, so each viewport fetches exactly one counter asset.
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
  const tone = 'onLight' as const
  const scrollerRef = React.useRef<HTMLDivElement>(null)
  const { scrollYProgress: progress } = useScroll({
    target: scrollerRef,
    offset: ['start start', 'end end'],
  })
  useActGravity(scrollerRef, progress)

  const [act, setAct] = React.useState(0)
  const [copy1Interactive, setCopy1Interactive] = React.useState(true)
  useMotionValueEvent(progress, 'change', (p) => {
    const next = ACT_BOUNDS.filter((bound) => p >= bound).length
    setAct((current) => (current === next ? current : next))
    const nextCopy1Interactive = p < COPY_1_HIDDEN_PROGRESS
    setCopy1Interactive((current) =>
      current === nextCopy1Interactive ? current : nextCopy1Interactive
    )
  })

  // backgrounds
  const bgWarmOpacity = useTrack(progress, K.bgWarmOpacity)
  const bgWarmScale = useTrack(progress, K.bgWarmScale)
  const bgSlateOpacity = useTrack(progress, K.bgSlateOpacity)

  // tablet — counter-hold stops come from the measured photo pin
  const stageRef = React.useRef<HTMLDivElement>(null)
  const stageSize = useStageSize(stageRef)
  const tabletOpacity = useTrack(progress, K.tabletOpacity)
  const tabletTracks = React.useMemo(
    () => pinnedTabletTracks(stageSize),
    [stageSize]
  )
  const tabletRotateX = useTrack(progress, tabletTracks.rotateX)
  const tabletRotateZ = useTrack(progress, tabletTracks.rotateZ)
  const tabletScale = useTrack(progress, tabletTracks.scale)
  const tabletX = useTrack(
    progress,
    tabletTracks.x,
    tabletTracks.px ? undefined : 'vw'
  )
  const tabletY = useTrack(
    progress,
    tabletTracks.y,
    tabletTracks.px ? undefined : 'vh'
  )

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
  const copy1InteractionProps = copy1Interactive
    ? {}
    : {
        'aria-hidden': true,
        inert: true,
      }

  return (
    <div ref={scrollerRef} className="relative h-[560vh]" data-testid="story-scroller">
      <div
        ref={stageRef}
        className="sticky top-0 h-screen overflow-hidden bg-slate-50"
      >
        {/* backgrounds: warm counter → slate studio */}
        <motion.div
          aria-hidden="true"
          className={cn('absolute inset-0', styles.woodCounterLight)}
          style={{ opacity: bgWarmOpacity, scale: bgWarmScale }}
        >
          {/* media-split sources: mobile (where this pinned variant is
              display:none) falls through to the small card file, which the
              static variant reuses from cache — desktop never downloads the
              card, mobile never downloads the 2K master */}
          <picture>
            <source
              media="(min-width: 768px)"
              srcSet="/images/story/counter-photo.avif"
              type="image/avif"
            />
            <source
              media="(min-width: 768px)"
              srcSet="/images/story/counter-photo.webp"
              type="image/webp"
            />
            <img
              src="/images/story/counter-photo-card.webp"
              alt=""
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </picture>
          {/* readability scrim under the act-1 copy */}
          <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/30 via-white/10 to-transparent" />
          {/* life at the top edge: soft patches of shade and warm light
              drift through a shallow masked band under the header — the
              light shifting as customers move beyond the counter */}
          <div aria-hidden="true" className={styles.counterLife}>
            <span className={styles.counterLife1} />
            <span className={styles.counterLife2} />
            <span className={styles.counterLife3} />
          </div>
        </motion.div>
        <motion.div
          aria-hidden="true"
          className={cn(
            'absolute inset-0 overflow-hidden',
            styles.lightStudio
          )}
          style={{ opacity: bgSlateOpacity }}
        >
          {/* the one continuous background: a slow-breathing brand gradient
              that ties acts 2-4 together (per-act patterns removed — the
              acts now illustrate their point with foreground animation) */}
          <div
            className={cn(
              'absolute -inset-x-[10%] -inset-y-[20%]',
              styles.ribbonWrap
            )}
          >
            <div className={cn('absolute left-[8%] top-[-18%] h-[70%] w-[55%] rounded-full', styles.ribbonBlob1)} />
            <div className={cn('absolute right-[-6%] top-[6%] h-[75%] w-[60%] rounded-full', styles.ribbonBlob2)} />
            <div className={cn('absolute bottom-[-22%] left-[34%] h-[60%] w-[46%] rounded-full', styles.ribbonBlob3)} />
            <div className={cn('absolute bottom-[-8%] left-[-8%] h-[52%] w-[38%] rounded-full', styles.ribbonBlob4)} />
          </div>
          <div className={cn('absolute inset-0', styles.ribbonMask)} />
        </motion.div>

        {/* the tablet — one element across all four acts. Translate lives on
            the outer wrapper and rotate/scale/perspective on the inner one:
            translating inside a perspective() transform projects the plane
            off-axis, which would skew the photo pin. Split this way the
            projection stays centered on the tablet, so the pin's
            position/mid-width math is exact. Perspective 1600 matches the
            photo tablet's near/far edge ratio. */}
        <div className="absolute left-1/2 top-1/2 z-10">
          <motion.div
            className="-ml-[230px] -mt-[159px]"
            style={{ opacity: tabletOpacity, x: tabletX, y: tabletY }}
          >
            <motion.div
              className="[transform-style:preserve-3d]"
              style={{
                rotateX: tabletRotateX,
                rotateZ: tabletRotateZ,
                scale: tabletScale,
                transformPerspective: 1600,
              }}
            >
              <DeviceTablet />
            </motion.div>
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
            <CyclingDevice active={act === 2} offsetMs={0}>
              <DeviceTerminal />
              <DeviceTerminal skin="light" />
              <DeviceScanner />
            </CyclingDevice>
          </motion.div>
        </div>
        <div className="absolute left-1/2 top-1/2 z-[9]">
          <motion.div
            className="-ml-[105px] -mt-[74px]"
            style={{ opacity: printerOpacity, x: printerX, y: printerY }}
          >
            <CyclingDevice active={act === 2} offsetMs={1200}>
              <DevicePrinter />
              <DevicePrinter skin="dark" />
            </CyclingDevice>
          </motion.div>
          <motion.div
            className="-ml-[60px] -mt-[95px]"
            style={{ opacity: scannerOpacity, x: scannerX, y: scannerY }}
          >
            <CyclingDevice active={act === 2} offsetMs={2300}>
              <DeviceScanner />
              <DeviceTerminal skin="light" className="scale-90" />
              <DevicePrinter className="scale-90" />
            </CyclingDevice>
          </motion.div>
        </div>

        {/* act 4: cloud sync */}
        <div className="absolute left-1/2 top-1/2 z-[8]">
          <motion.div
            className="relative -ml-[280px] -mt-[290px]"
            style={{ opacity: cloudOpacity, x: '10vw', y: cloudY }}
          >
            <DotOrbit className="absolute left-1/2 top-[190px] -translate-x-1/2 -translate-y-1/2" />
            <CloudSync light />
          </motion.div>
        </div>

        {/* copy overlays */}
        <motion.div
          {...copy1InteractionProps}
          className={cn(
            'absolute left-1/2 top-[10%] z-20 w-full max-w-2xl -translate-x-1/2 text-center',
            !copy1Interactive && 'pointer-events-none'
          )}
          style={{ opacity: copy1Opacity }}
        >
          <CopyAct1 tone={tone} />
        </motion.div>
        <motion.div
          className="pointer-events-none absolute left-[6%] top-1/2 z-20 max-w-sm -translate-y-1/2"
          style={{ opacity: copy2Opacity }}
        >
          <CopyAct2 tone={tone} />
        </motion.div>
        <motion.div
          className="pointer-events-none absolute left-[6%] top-1/2 z-20 max-w-sm -translate-y-1/2"
          style={{ opacity: copy3Opacity }}
        >
          <CopyAct3 tone={tone} />
        </motion.div>
        <motion.div
          className="pointer-events-none absolute left-[6%] top-1/2 z-20 max-w-sm -translate-y-1/2"
          style={{ opacity: copy4Opacity }}
        >
          <CopyAct4 tone={tone} />
        </motion.div>

        {/* scroll hint */}
        <motion.div
          aria-hidden="true"
          className={cn(
            'absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.14em]',
            'bg-white/70 text-slate-500'
          )}
          style={{ opacity: hintOpacity }}
        >
          Scroll ↓
        </motion.div>

        {/* act progress dots — click to jump to an act (targets are the
            act-gravity settle anchors, so the settle assist stays quiet) */}
        <div className="absolute right-6 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1">
          {[0, 1, 2, 3].map((i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to act ${i + 1} of 4`}
              aria-current={i === act ? 'step' : undefined}
              onClick={() => {
                const scroller = scrollerRef.current
                if (!scroller) return
                const p = i === 0 ? 0 : ACT_HOLDS[i - 1]
                const top =
                  scroller.getBoundingClientRect().top + window.scrollY
                window.scrollTo({
                  top: top + (scroller.offsetHeight - window.innerHeight) * p,
                  behavior: 'smooth',
                })
              }}
              className="group flex h-5 w-5 items-center justify-center"
            >
              <span
                className={cn(
                  'h-2 w-2 rounded-full transition-all duration-300 group-hover:scale-125',
                  i === act ? 'scale-125 bg-wcpos-red' : 'bg-slate-300'
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
