'use client'

import { useCallback, useEffect, useMemo, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * PROTOTYPE — variant gate + floating switcher bar for the roadmap redesign
 * prototype. Reads `?variant=` client-side (keeps the server page static),
 * renders the matching server-rendered variant, and shows a dev-only pill to
 * cycle variants (click arrows or use ← / →). Delete with the prototype.
 */

export interface PrototypeVariant {
  key: string
  name: string
  node: ReactNode
}

export function VariantGate({ variants }: { variants: PrototypeVariant[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const keys = useMemo(() => variants.map((v) => v.key), [variants])
  const currentKey = searchParams.get('variant') ?? keys[0]
  const index = Math.max(0, keys.indexOf(currentKey))
  const current = variants[index]

  const goTo = useCallback(
    (i: number) => {
      const next = keys[(i + keys.length) % keys.length]
      const params = new URLSearchParams(searchParams.toString())
      params.set('variant', next)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [keys, pathname, router, searchParams],
  )

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
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

  return (
    <>
      {current.node}
      {process.env.NODE_ENV !== 'production' && (
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
            {index + 1}/{keys.length} &middot; {current.key} — {current.name}
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
      )}
    </>
  )
}
