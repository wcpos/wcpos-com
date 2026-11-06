// Compatibility shim: DotOrbit moved to the motion kit (ADR 0014) and grew
// props for dot count, size and palette — the defaults reproduce this
// homepage ring exactly. New code should import from '@/components/motion'.
export { DotOrbit } from '@/components/motion/dot-orbit'
