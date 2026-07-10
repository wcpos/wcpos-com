'use client'

import { isAnalyticsGranted } from './consent'
import { parsePostHogSessionId } from './checkout-attribution'
import {
  ANALYTICS_DISTINCT_ID_COOKIE,
  getDistinctIdCookieOptions,
  newDistinctId,
} from './distinct-id'

let started = false

type QueuedCapture = { name: string; properties?: Record<string, unknown> }

type WindowWithPostHog = Window & {
  posthog?: {
    capture?: (name: string, properties?: Record<string, unknown>) => void
    get_session_id?: () => unknown
  }
}

/** Read the current PostHog session without bypassing consent or throwing. */
export function getPostHogSessionId(): string | undefined {
  if (typeof window === 'undefined' || !isAnalyticsGranted()) return undefined

  try {
    const posthog = (window as WindowWithPostHog).posthog
    if (typeof posthog?.get_session_id !== 'function') return undefined
    return parsePostHogSessionId(posthog.get_session_id())
  } catch {
    return undefined
  }
}

/**
 * Captures fired while the dynamically-imported SDK is still in flight are held
 * here and replayed once `window.posthog` exists. Without this, a visitor who
 * clicks a tracked CTA (download, checkout, support feedback) in the few hundred
 * ms between consent opening the gate and the posthog-js chunk landing loses the
 * event — the static import used to make init synchronous, the dynamic one does
 * not.
 *
 * Non-null ONLY while an init is in flight, so a session that never initializes
 * (no consent, no key, chunk load failed) drops captures instead of growing an
 * unbounded queue. The cap bounds a pathological burst during that window.
 */
const MAX_QUEUED_CAPTURES = 50
let pendingCaptures: QueuedCapture[] | null = null

/**
 * Send an event to posthog-js, or queue it if the SDK is still loading.
 * Fire-and-forget: never throws. Consent is enforced upstream (see
 * client-events.ts); this only decides capture-now vs capture-later vs drop.
 */
export function capturePostHogBrowser(
  name: string,
  properties?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return
  const posthog = (window as WindowWithPostHog).posthog
  if (posthog?.capture) {
    posthog.capture(name, properties)
    return
  }
  if (!pendingCaptures || pendingCaptures.length >= MAX_QUEUED_CAPTURES) return
  pendingCaptures.push({ name, properties })
}

function flushPendingCaptures(): void {
  const queued = pendingCaptures
  pendingCaptures = null
  if (!queued?.length) return
  const posthog = (window as WindowWithPostHog).posthog
  for (const { name, properties } of queued) {
    try {
      posthog?.capture?.(name, properties)
    } catch {
      // Analytics is fire-and-forget: one bad replay must not drop the rest.
    }
  }
}

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
  try {
    const value = decodeURIComponent(row.slice(prefix.length))
    return value || undefined
  } catch {
    // A malformed % escape in the user-controlled cookie must fail closed, not
    // throw and leave window.posthog unset (every later init returns early).
    return undefined
  }
}

/**
 * Persist a freshly-minted shared distinct id from the browser, mirroring the
 * cookie middleware.ts sets (same name, path, and one-year max-age) so the
 * server adopts it on the next request. Secure follows the page protocol rather
 * than NODE_ENV — like writeAnalyticsConsent — because e2e serves a production
 * build over http://localhost and WebKit drops Secure cookies set over http.
 */
function writeSharedDistinctId(id: string): void {
  if (typeof document === 'undefined') return
  const options = getDistinctIdCookieOptions()
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${ANALYTICS_DISTINCT_ID_COOKIE}=${encodeURIComponent(id)}; Path=${options.path}; Max-Age=${options.maxAge}; SameSite=Lax${secure}`
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
 * When the cookie is missing we mint and persist one BEFORE init (and before
 * the SDK import awaits) instead of letting posthog-js create its own anon id.
 * The ConsentBanner grants consent and calls this in the same task, before
 * middleware has minted the cookie on a page response — so without this the
 * SPA session would live under posthog's id while the later cookie drives
 * checkout_completed, splitting the first-session buyer funnel across two
 * people.
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
export async function initPostHogBrowser(config: { key?: string; host?: string }) {
  if (started || typeof window === 'undefined') return
  if (!config.key || !config.host) return
  if (!isAnalyticsGranted()) return

  started = true
  // Open the queue before the first await: captures raced against the SDK
  // import land here and are replayed once posthog-js is on window.
  pendingCaptures = []
  let sharedDistinctId = readSharedDistinctId()
  if (!sharedDistinctId) {
    sharedDistinctId = newDistinctId()
    writeSharedDistinctId(sharedDistinctId)
  }
  // posthog-js is imported here, after the consent gate, instead of at module
  // top level: this module is in the initial client graph of every page (via
  // ClientLoggingInit and ConsentBanner), and a static import would ship the
  // ~60KB SDK to every visitor — including the unconsented ones it may never
  // initialize for.
  try {
    const { default: posthog } = await import('posthog-js')
    posthog.init(config.key, {
      api_host: config.host,
      autocapture: false,
      capture_pageview: 'history_change',
      capture_pageleave: true,
      capture_exceptions: true,
      disable_session_recording: true,
      persistence: 'localStorage+cookie',
      bootstrap: { distinctID: sharedDistinctId },
    })
    ;(window as unknown as { posthog: typeof posthog }).posthog = posthog
    flushPendingCaptures()
  } catch {
    // Chunk load failed (offline, or an adblocker that filters "posthog" in
    // URLs). Callers fire-and-forget with `void`, so the rejection must be
    // contained here — and `started` is reset so a later call (e.g. the
    // consent banner after a transient failure) can retry instead of the
    // session being permanently dark. Queued captures are dropped rather than
    // held for a retry that may never come.
    started = false
    pendingCaptures = null
  }
}
