'use client'

import posthog from 'posthog-js'
import { isAnalyticsGranted } from './consent'
import { ANALYTICS_DISTINCT_ID_COOKIE } from './distinct-id'

let started = false

/**
 * The `wcpos-distinct-id` cookie is minted by middleware.ts (httpOnly: false)
 * and every server-side funnel event (checkout_completed, signup_completed) is
 * captured against it. Read it here so posthog-js can adopt the SAME id instead
 * of minting its own anon id — otherwise the browsing session and the sale live
 * under two different people and no funnel can connect them.
 */
function readSharedDistinctId(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const prefix = `${ANALYTICS_DISTINCT_ID_COOKIE}=`
  const row = document.cookie.split('; ').find((c) => c.startsWith(prefix))
  if (!row) return undefined
  const value = decodeURIComponent(row.slice(prefix.length))
  return value || undefined
}

/**
 * Initialize posthog-js once, only after the visitor has granted analytics
 * consent. Sets window.posthog (which trackClientEvent reads). Autocapture is
 * off — we send explicit funnel events to keep the data deterministic. Pageviews
 * are captured on History API changes so client-side (App Router) navigations
 * register; this powers PostHog Web Analytics (visitors, top pages, sessions).
 *
 * Identity is stitched to the server via `bootstrap.distinctID`: the browser and
 * the server share the `wcpos-distinct-id` cookie, so a $pageview and the
 * checkout_completed it leads to resolve to one PostHog person — which is what
 * makes end-to-end funnels and source attribution work. The id stays anonymous
 * (isIdentifiedID omitted/false); no PII is attached.
 *
 * Exception autocapture is on (`capture_exceptions`): $exception events post via
 * the normal /e/ endpoint (unlike session replay's /s/), so they are safe on the
 * self-hosted instance and surface JS errors in the checkout flow — where money
 * is made.
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
  const sharedDistinctId = readSharedDistinctId()
  posthog.init(config.key, {
    api_host: config.host,
    autocapture: false,
    capture_pageview: 'history_change',
    capture_pageleave: true,
    capture_exceptions: true,
    disable_session_recording: true,
    persistence: 'localStorage+cookie',
    ...(sharedDistinctId
      ? { bootstrap: { distinctID: sharedDistinctId } }
      : {}),
  })
  ;(window as unknown as { posthog: typeof posthog }).posthog = posthog
}
