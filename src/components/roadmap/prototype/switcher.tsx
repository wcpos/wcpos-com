'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export function PrototypeSwitcher({ current }: { current: 'A' | 'B' | 'C' }) {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  const labels = ['A — Release train', 'B — Hero + cards', 'C — Ledger']
  const index = ['A', 'B', 'C'].indexOf(current)
  function cycle(direction: number) {
    const params = new URLSearchParams(search.toString())
    params.set('variant', ['A', 'B', 'C'][(index + direction + 3) % 3])
    router.replace(`${pathname}?${params}`, { scroll: false })
  }
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    function onKey(event: KeyboardEvent) {
      const target = document.activeElement
      if (target instanceof HTMLElement && (target.matches('input, textarea') || target.isContentEditable)) return
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      event.preventDefault()
      cycle(event.key === 'ArrowLeft' ? -1 : 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, pathname, search, router])
  if (process.env.NODE_ENV === 'production') return null
  return <div className="fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border-2 border-yellow-300 bg-slate-950 px-2 py-2 font-mono text-xs text-white shadow-2xl" data-prototype-switcher>
    <button onClick={() => cycle(-1)} className="rounded-full px-3 py-2 hover:bg-slate-700" aria-label="Previous variant">←</button>
    <span className="min-w-40 text-center">{labels[index]}</span>
    <button onClick={() => cycle(1)} className="rounded-full px-3 py-2 hover:bg-slate-700" aria-label="Next variant">→</button>
  </div>
}
