'use client'

import { useCallback, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

/**
 * PROTOTYPE — dev-only floating switcher bar for the roadmap redesign
 * prototype. The variant itself is chosen SERVER-side from `?variant=` (see
 * page.tsx); this bar only navigates between variants (click arrows or use
 * ← / →). Self-contained client island — passing server-rendered nodes
 * through a client gate broke hydration under cacheComponents.
 * Delete with the prototype.
 */

export function PrototypeSwitcher({
  variants,
  current,
}: {
  variants: { key: string; name: string }[]
  current: string
}) {
  const router = useRouter()
  const pathname = usePathname()

  const index = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  )

  const goTo = useCallback(
    (i: number) => {
      const next = variants[(i + variants.length) % variants.length]
      router.replace(`${pathname}?variant=${next.key}`, { scroll: false })
    },
    [pathname, router, variants],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      if (e.key === 'ArrowLeft') goTo(index - 1)
      if (e.key === 'ArrowRight') goTo(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goTo, index])

  if (process.env.NODE_ENV === 'production') return null

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/20 bg-slate-950/90 px-2 py-1.5 font-mono text-xs text-white shadow-xl backdrop-blur">
      <button
        type="button"
        aria-label="Previous variant"
        onClick={() => goTo(index - 1)}
        className="rounded-full px-2 py-0.5 hover:bg-white/15"
      >
        &larr;
      </button>
      <span className="min-w-44 text-center tabular-nums">
        {index + 1}/{variants.length} &middot; {variants[index].key} —{' '}
        {variants[index].name}
      </span>
      <button
        type="button"
        aria-label="Next variant"
        onClick={() => goTo(index + 1)}
        className="rounded-full px-2 py-0.5 hover:bg-white/15"
      >
        &rarr;
      </button>
    </div>
  )
}
