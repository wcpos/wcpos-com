// PROTOTYPE — throwaway. Floating variant switcher for the /downloads hero
// prototype. Hidden in production builds; delete with hero-prototype/.
'use client'

import { useCallback, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function PrototypeSwitcher({
  variants,
  current,
  labels,
}: {
  variants: string[]
  current: string
  labels: Record<string, string>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const go = useCallback(
    (delta: number) => {
      const index = Math.max(variants.indexOf(current), 0)
      const next = variants[(index + delta + variants.length) % variants.length]
      const params = new URLSearchParams(searchParams.toString())
      params.set('variant', next)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [variants, current, searchParams, router, pathname],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      if (event.key === 'ArrowLeft') go(-1)
      if (event.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  if (process.env.NODE_ENV === 'production') return null

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-slate-900 px-2 py-1.5 text-white shadow-lg">
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Previous variant"
        className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/15"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="min-w-48 px-2 text-center text-xs font-medium tabular-nums">
        {current.toUpperCase()} — {labels[current] ?? 'Unknown'}
      </span>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Next variant"
        className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/15"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
