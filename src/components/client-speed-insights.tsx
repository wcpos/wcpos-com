'use client'

import { useSyncExternalStore } from 'react'
import { SpeedInsights } from '@vercel/speed-insights/next'

const subscribe = () => () => {}
const getHydratedSnapshot = () => true
const getServerSnapshot = () => false

/**
 * Mounts Vercel Speed Insights only after hydration. The component's internal
 * useSearchParams() otherwise runs during the static prerender of every
 * locale layout and logs a "Bail out to client-side rendering" error per
 * locale (10 per build) — a Suspense wrapper does not contain it at layout
 * level. RUM capture only functions in the browser, so deferring to mount
 * loses nothing.
 */
export function ClientSpeedInsights() {
  const hydrated = useSyncExternalStore(subscribe, getHydratedSnapshot, getServerSnapshot)
  if (!hydrated) return null
  return <SpeedInsights />
}
