'use client'

import posthog from 'posthog-js'
import { isAnalyticsGranted } from './consent'

let started = false

/**
 * Initialize posthog-js once, only after the visitor has granted analytics
 * consent. Sets window.posthog (which trackClientEvent reads). Autocapture is
 * off — we send explicit funnel events to keep the data deterministic. Pageviews
 * are captured on History API changes so client-side (App Router) navigations
 * register; this powers PostHog Web Analytics (visitors, top pages, sessions).
 *
 * Session replay is disabled: the self-hosted instance at ph.wcpos.com does not
 * have the replay-capture service provisioned, so its /s/ ingest endpoint returns
 * 403. With replay enabled server-side but /s/ unreachable, posthog-js retries the
 * upload forever and floods the console with CORS/403 errors on every page. Event
 * capture (/e/), pageviews, and feature flags (/flags/) are unaffected and keep
 * working. Re-enable (remove this flag) once /s/ is wired up on the PostHog
 * deployment.
 */
export function initPostHogBrowser(config: { key?: string; host?: string }) {
  if (started || typeof window === 'undefined') return
  if (!config.key || !config.host) return
  if (!isAnalyticsGranted()) return

  started = true
  posthog.init(config.key, {
    api_host: config.host,
    autocapture: false,
    capture_pageview: 'history_change',
    capture_pageleave: true,
    disable_session_recording: true,
    persistence: 'localStorage+cookie',
  })
  ;(window as unknown as { posthog: typeof posthog }).posthog = posthog
}
