'use client'

import * as React from 'react'
import { motion, useReducedMotion } from 'motion/react'

/**
 * Reveal — the kit's scroll-into-view primitive (ADR 0013).
 *
 * Fades + lifts children as they enter the viewport: transform/opacity only,
 * under 500ms, once by default. Under prefers-reduced-motion it renders a
 * plain, fully visible div (no animation, no initial-hidden state).
 *
 * Interaction feedback stays fast per the motion rules — keep `delay` for
 * small stagger steps (≤0.3s), not for long choreography.
 */

export type RevealProps = {
  children: React.ReactNode
  className?: string
  /** Delay in seconds — use for small stagger steps between siblings. */
  delay?: number
  /** Vertical offset in px the content rises from. */
  y?: number
  /** Animate only the first time it enters the viewport. */
  once?: boolean
}

export function Reveal({
  children,
  className,
  delay = 0,
  y = 16,
  once = true,
}: RevealProps) {
  const reducedMotion = useReducedMotion()

  if (reducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.3 }}
      transition={{ duration: 0.45, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  )
}
