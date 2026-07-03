/**
 * Choreography tables for the pinned scroll story.
 *
 * Each track is [progress stops, values] consumed by motion's useTransform.
 * Progress runs 0→1 across the whole 560vh scroller. Acts:
 *   1 counter ~0–0.13 · swing 0.13–0.30 · 2 platforms hold→0.46 ·
 *   3 hardware 0.46–0.78 · 4 cloud 0.78–1
 *
 * INVARIANT: every track has explicit stops at 0 and 1. Motion compiles
 * opacity tracks to WAAPI ScrollTimeline animations, and WAAPI fills missing
 * 0/1 offsets with implicit keyframes from the element's base value — which
 * makes faded-out layers "loop back" in at high progress. Explicit endpoints
 * prevent that (and cost nothing for the JS-driven transform tracks).
 *
 * Units are noted per track: plain numbers are unitless (opacity, scale,
 * degrees); vw/vh tracks are wrapped in useMotionTemplate by the consumer.
 */
export type Track = readonly [readonly number[], readonly number[]]

export const K = {
  // backgrounds: warm counter cools into the slate studio
  bgWarmOpacity: [
    [0, 0.14, 0.32, 1],
    [1, 1, 0, 0],
  ],
  bgWarmScale: [
    [0, 0.12, 0.32, 1],
    [1, 1, 1.18, 1.18],
  ],
  bgSlateOpacity: [
    [0, 0.16, 0.4, 1],
    [0, 0, 1, 1],
  ],

  // act 1 counter props slide off as the "camera" tilts up
  propsOpacity: [
    [0, 0.13, 0.26, 1],
    [1, 1, 0, 0],
  ],
  propsY: [
    [0, 0.12, 0.3, 1],
    [0, 0, 42, 42],
  ], // vh
  propsScale: [
    [0, 0.12, 0.3, 1],
    [1, 1, 1.12, 1.12],
  ],

  // the tablet: top-down → face-on → hold → step back for the cloud.
  // Invisible during the counter hold — the photographed tablet (with the
  // POS UI baked into its screen) plays the part at rest; the live DOM
  // tablet fades in as it starts lifting out of the photo.
  tabletOpacity: [
    [0, 0.13, 0.17, 1],
    [0, 0, 1, 1],
  ],
  tabletRotateX: [
    [0, 0.13, 0.3, 1],
    [58, 58, 0, 0],
  ], // deg
  tabletRotateZ: [
    [0, 0.3, 1],
    [-4, 0, 0],
  ], // deg
  tabletScale: [
    [0, 0.13, 0.3, 0.42, 0.55, 0.68, 0.82, 1],
    [0.82, 0.82, 1.08, 1.08, 0.94, 0.94, 0.78, 0.78],
  ],
  tabletY: [
    [0, 0.13, 0.3, 0.68, 0.84, 1],
    [14, 14, 0, 0, 16, 16],
  ], // vh
  tabletX: [
    [0, 0.16, 0.32, 0.44, 0.56, 0.7, 0.84, 1],
    [0, 0, 12, 12, 9, 9, 10, 10],
  ], // vw

  // act 2: phone in from the left, laptop from the right
  phoneOpacity: [
    [0, 0.2, 0.28, 0.46, 0.54, 1],
    [0, 0, 1, 1, 0, 0],
  ],
  phoneX: [
    [0, 0.2, 0.32, 0.46, 0.56, 1],
    [-60, -60, -6, -6, -60, -60],
  ], // vw
  laptopOpacity: [
    [0, 0.22, 0.3, 0.46, 0.54, 1],
    [0, 0, 1, 1, 0, 0],
  ],
  laptopX: [
    [0, 0.22, 0.34, 0.46, 0.56, 1],
    [60, 60, 30, 30, 60, 60],
  ], // vw

  // act 3: terminal / printer / scanner ring the tablet (center ~9vw at the
  // hold): scanner at ~10 o'clock fronting the top-left corner, terminal at
  // 3 fronting the right edge, printer at ~7 under the left half — each
  // enters from its own side (right / below / above) and leaves the same
  // way. These vw/vh tracks are the pre-measure/SSR fallback; once the stage
  // is measured, scroll-story's act3HardwareTracks replaces the rest stops
  // with fixed px offsets from the tablet so the ring holds on wide stages.
  terminalOpacity: [
    [0, 0.46, 0.54, 0.7, 0.78, 1],
    [0, 0, 1, 1, 0, 0],
  ],
  terminalX: [
    [0, 0.46, 0.58, 0.7, 0.8, 1],
    [60, 60, 24, 24, 60, 60],
  ], // vw
  printerOpacity: [
    [0, 0.46, 0.54, 0.7, 0.78, 1],
    [0, 0, 1, 1, 0, 0],
  ],
  printerX: [
    [0, 1],
    [1, 1],
  ], // vw
  printerY: [
    [0, 0.46, 0.58, 0.7, 0.8, 1],
    [45, 45, 28, 28, 45, 45],
  ], // vh
  scannerOpacity: [
    [0, 0.48, 0.56, 0.7, 0.78, 1],
    [0, 0, 1, 1, 0, 0],
  ],
  scannerX: [
    [0, 1],
    [-6, -6],
  ], // vw
  scannerY: [
    [0, 0.48, 0.6, 0.7, 0.8, 1],
    [-50, -50, -26, -26, -50, -50],
  ], // vh

  // act 4: the Woo cloud rises above the tablet
  cloudOpacity: [
    [0, 0.78, 0.88, 1],
    [0, 0, 1, 1],
  ],
  cloudY: [
    [0, 0.78, 0.9, 1],
    [6, 6, 0, 0],
  ], // vh

  // copy overlays
  copy1Opacity: [
    [0, 0.08, 0.15, 1],
    [1, 1, 0, 0],
  ],
  copy2Opacity: [
    [0, 0.28, 0.34, 0.46, 0.52, 1],
    [0, 0, 1, 1, 0, 0],
  ],
  copy3Opacity: [
    [0, 0.54, 0.6, 0.7, 0.76, 1],
    [0, 0, 1, 1, 0, 0],
  ],
  copy4Opacity: [
    [0, 0.84, 0.92, 1],
    [0, 0, 1, 1],
  ],

  hintOpacity: [
    [0, 0.01, 0.04, 1],
    [1, 1, 0, 0],
  ],
} as const satisfies Record<string, Track>

/** Act boundaries for the progress indicator dots. */
export const ACT_BOUNDS = [0.2, 0.5, 0.78] as const
