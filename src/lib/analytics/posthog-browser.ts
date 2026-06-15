'use client'

import posthog from 'posthog-js'
import { readAnalyticsConsent } from './consent'

let started = false

/**
 * Initialize posthog-js once, only after the visitor has granted analytics
 * consent. Sets window.posthog (which trackClientEvent reads). Autocapture is
 * off — we send explicit funnel events to keep the data deterministic.
 */
export function initPostHogBrowser(config: { key?: string; host?: string }) {
  if (started || typeof window === 'undefined') return
  if (!config.key || !config.host) return
  if (readAnalyticsConsent() !== 'granted') return

  started = true
  posthog.init(config.key, {
    api_host: config.host,
    autocapture: false,
    capture_pageview: false,
    persistence: 'localStorage+cookie',
  })
  ;(window as unknown as { posthog: typeof posthog }).posthog = posthog
}
