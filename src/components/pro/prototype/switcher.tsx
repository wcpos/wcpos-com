/**
 * PROTOTYPE — throwaway code, do not ship.
 *
 * Floating bottom-centre bar for flipping between pricing variants via the
 * ?variant= search param. Not part of the design being evaluated.
 */
'use client'

import { useCallback, useEffect, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export interface PrototypeVariantOption {
  key: string
  label: string
}

export function PrototypeSwitcher({
  variants,
  current,
  children,
}: {
  variants: readonly PrototypeVariantOption[]
  current: string
  children?: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const index = Math.max(
    0,
    variants.findIndex((variant) => variant.key === current)
  )

  const go = useCallback(
    (step: number) => {
      const next =
        variants[(index + step + variants.length) % variants.length]
      const params = new URLSearchParams(searchParams.toString())
      params.set('variant', next.key)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [index, pathname, router, searchParams, variants]
  )

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
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
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [go])

  const label = variants[index]

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white shadow-xl">
      <button
        type="button"
        aria-label="Previous variant"
        onClick={() => go(-1)}
        className="rounded-full px-2 py-0.5 hover:bg-zinc-700"
      >
        ←
      </button>
      <span className="whitespace-nowrap font-mono">
        {label.key.toUpperCase()} — {label.label}
      </span>
      <button
        type="button"
        aria-label="Next variant"
        onClick={() => go(1)}
        className="rounded-full px-2 py-0.5 hover:bg-zinc-700"
      >
        →
      </button>
      {children}
    </div>
  )
}
