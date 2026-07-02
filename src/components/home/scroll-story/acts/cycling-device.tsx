'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * "Anything works": cycles a slot through different hardware models with a
 * gentle crossfade + tilt. Timer only runs while the act is on stage
 * (`active`), the tab is visible, and the user hasn't asked for reduced
 * motion; transitions are transform/opacity only.
 */
export function CyclingDevice({
  children,
  intervalMs = 3400,
  offsetMs = 0,
  active = true,
  className,
}: {
  children: React.ReactNode[]
  intervalMs?: number
  offsetMs?: number
  active?: boolean
  className?: string
}) {
  const count = children.length
  const [index, setIndex] = React.useState(0)

  React.useEffect(() => {
    if (!active || count < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let interval: ReturnType<typeof setInterval> | undefined
    const timeout = setTimeout(() => {
      setIndex((current) => (current + 1) % count)
      interval = setInterval(() => {
        if (document.hidden) return
        setIndex((current) => (current + 1) % count)
      }, intervalMs)
    }, offsetMs)

    return () => {
      clearTimeout(timeout)
      if (interval) clearInterval(interval)
    }
  }, [active, count, intervalMs, offsetMs])

  return (
    <div className={cn('relative', className)}>
      {React.Children.map(children, (child, i) => (
        <div
          className={cn(
            'transition-[opacity,transform] duration-700 ease-out',
            i === 0 ? 'relative' : 'absolute inset-0 flex items-center justify-center',
            i === index
              ? 'opacity-100 [transform:rotate(0deg)_scale(1)]'
              : 'pointer-events-none opacity-0 [transform:rotate(4deg)_scale(0.92)]'
          )}
        >
          {child}
        </div>
      ))}
    </div>
  )
}
