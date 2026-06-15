'use client'

import { useEffect } from 'react'
import { initializeClientLogging } from '@/lib/client-logger'
import { initPostHogBrowser } from '@/lib/analytics/posthog-browser'

/**
 * Initialize client-side logging
 * This component should be included once in the root layout
 */
export function ClientLoggingInit() {
  useEffect(() => {
    initializeClientLogging()
    initPostHogBrowser({
      key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    })
  }, [])

  return null
}
