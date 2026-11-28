// Compatibility shim: AmbientGradient moved to the motion kit (ADR 0014).
// The scroll-story branch imports it from here; new code should import
// from '@/components/motion' directly.
export { AmbientGradient } from '@/components/motion/ambient-gradient'
