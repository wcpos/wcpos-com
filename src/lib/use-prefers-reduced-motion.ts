'use client'

import { useSyncExternalStore } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {}
  const mql = window.matchMedia(REDUCED_MOTION_QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

function getSnapshot() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches
  )
}

function getServerSnapshot() {
  return false
}

/**
 * SSR-safe prefers-reduced-motion hook. Motion's useReducedMotion caches the
 * media query in module state and reports the real value during the hydration
 * render, so any markup derived from it (tabIndex, variants) mismatches the
 * server HTML for reduced-motion users. The server snapshot here is `false`:
 * SSR and the hydration render both emit the motion-enabled markup, and
 * reduced-motion users swap to the static variant immediately after hydration.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
