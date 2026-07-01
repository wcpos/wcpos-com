/**
 * Choreography tables for the pinned scroll story.
 *
 * Each track is [progress stops, values] consumed by motion's useTransform.
 * Progress runs 0→1 across the whole 560vh scroller. Acts:
 *   1 counter ~0–0.13 · swing 0.13–0.30 · 2 platforms hold→0.46 ·
 *   3 hardware 0.46–0.78 · 4 cloud 0.78–1
 *
 * Units are noted per track: plain numbers are unitless (opacity, scale,
 * degrees); vw/vh tracks are wrapped in useMotionTemplate by the consumer.
 */
export type Track = readonly [readonly number[], readonly number[]]

export const K = {
  // backgrounds: warm counter cools into the slate studio
  bgWarmOpacity: [
    [0.14, 0.32],
    [1, 0],
  ],
  bgWarmScale: [
    [0.12, 0.32],
    [1, 1.18],
  ],
  bgSlateOpacity: [
    [0.16, 0.4],
    [0, 1],
  ],

  // act 1 counter props slide off as the "camera" tilts up
  propsOpacity: [
    [0.13, 0.26],
    [1, 0],
  ],
  propsY: [
    [0.12, 0.3],
    [0, 42],
  ], // vh
  propsScale: [
    [0.12, 0.3],
    [1, 1.12],
  ],

  // the tablet: top-down → face-on → hold → step back for the cloud
  tabletRotateX: [
    [0.13, 0.3],
    [58, 0],
  ], // deg
  tabletRotateZ: [
    [0, 0.3],
    [-4, 0],
  ], // deg
  tabletScale: [
    [0.13, 0.3, 0.42, 0.55, 0.68, 0.82],
    [0.82, 1.08, 1.08, 0.94, 0.94, 0.78],
  ],
  tabletY: [
    [0.13, 0.3, 0.68, 0.84],
    [6, 0, 0, 14],
  ], // vh
  tabletX: [
    [0.16, 0.32, 0.44, 0.56, 0.7, 0.84],
    [0, 6, 6, 8, 8, 10],
  ], // vw

  // act 2: phone in from the left, laptop from the right
  phoneOpacity: [
    [0.2, 0.28, 0.46, 0.54],
    [0, 1, 1, 0],
  ],
  phoneX: [
    [0.2, 0.32, 0.46, 0.56],
    [-60, -13, -13, -60],
  ], // vw
  laptopOpacity: [
    [0.22, 0.3, 0.46, 0.54],
    [0, 1, 1, 0],
  ],
  laptopX: [
    [0.22, 0.34, 0.46, 0.56],
    [60, 25, 25, 60],
  ], // vw

  // act 3: terminal / printer / scanner ring the tablet
  terminalOpacity: [
    [0.46, 0.54, 0.7, 0.78],
    [0, 1, 1, 0],
  ],
  terminalX: [
    [0.46, 0.58, 0.7, 0.8],
    [60, 25, 25, 60],
  ], // vw
  printerOpacity: [
    [0.46, 0.54, 0.7, 0.78],
    [0, 1, 1, 0],
  ],
  printerX: [
    [0.46, 0.58, 0.7, 0.8],
    [45, 20, 20, 45],
  ], // vw
  printerY: [
    [0.46, 0.58],
    [40, 24],
  ], // vh
  scannerOpacity: [
    [0.48, 0.56, 0.7, 0.78],
    [0, 1, 1, 0],
  ],
  scannerX: [
    [0.48, 0.6, 0.7, 0.8],
    [40, 31, 31, 40],
  ], // vw
  scannerY: [
    [0.48, 0.6],
    [-50, -30],
  ], // vh

  // act 4: the Woo cloud rises above the tablet
  cloudOpacity: [
    [0.78, 0.88],
    [0, 1],
  ],
  cloudY: [
    [0.78, 0.9],
    [4, -9],
  ], // vh

  // copy overlays
  copy1Opacity: [
    [0.08, 0.15],
    [1, 0],
  ],
  copy2Opacity: [
    [0.28, 0.34, 0.46, 0.52],
    [0, 1, 1, 0],
  ],
  copy3Opacity: [
    [0.54, 0.6, 0.7, 0.76],
    [0, 1, 1, 0],
  ],
  copy4Opacity: [
    [0.84, 0.92],
    [0, 1],
  ],

  hintOpacity: [
    [0.01, 0.04],
    [1, 0],
  ],
} as const satisfies Record<string, Track>

/** Act boundaries for the progress indicator dots. */
export const ACT_BOUNDS = [0.2, 0.5, 0.78] as const
