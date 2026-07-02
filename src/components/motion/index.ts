/**
 * The motion kit (ADR 0013 — site motion language).
 *
 * Two libraries, pushed hard: `motion` for scroll/springs/gestures and
 * `three` + `@react-three/fiber` for component-scale 3D centerpieces.
 * Custom canvas/WebGL (AmbientGradient, DotOrbit) stays for cases smaller
 * than a three scene. Every piece is IO/visibility gated and
 * reduced-motion aware.
 */

export { AmbientGradient } from './ambient-gradient'
export { DotOrbit, type DotOrbitProps } from './dot-orbit'
export { Reveal, type RevealProps } from './reveal'
export { SpikeBurst, type SpikeBurstProps } from './spike-burst'
