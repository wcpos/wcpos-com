'use client'

import * as React from 'react'

/**
 * Media-query subscription for `prefers-reduced-motion: reduce` — local
 * instead of motion's useReducedMotion, which caches the query result in
 * module state. The server snapshot is `false` so SSR emits the animated
 * markup and reduced-motion users swap to their static variant on hydration.
 * The matchMedia guard keeps non-browser DOM environments (jsdom) on the
 * animated path instead of crashing.
 */
export function usePrefersReducedMotion() {
  return React.useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () =>
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false
  )
}
