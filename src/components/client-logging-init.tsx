'use client'

import { useEffect } from 'react'
import { initializeClientLogging } from '@/lib/client-logger'

/**
 * Initialize client-side logging
 * This component should be included once in the root layout
 */
export function ClientLoggingInit() {
  useEffect(() => {
    initializeClientLogging()
  }, [])

  return null
}
