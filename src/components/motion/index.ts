/**
 * The motion kit (ADR 0014 — site motion language).
 *
 * One library pushed hard — `motion` for scroll/springs/gestures — plus the
 * custom canvas/WebGL primitives (AmbientGradient, DotOrbit) for the two
 * signature surfaces. Every piece is IO/visibility gated and reduced-motion
 * aware. A three/R3F 3D centerpiece was prototyped and rejected (2026-07-02):
 * not worth a 3D library for a site with no other 3D need.
 */

export { AmbientGradient } from './ambient-gradient'
export { DotOrbit, type DotOrbitProps } from './dot-orbit'
export { Reveal, type RevealProps } from './reveal'
