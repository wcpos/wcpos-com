import 'server-only'
import { headers } from 'next/headers'
import { getAnalyticsConfig } from '@/lib/analytics/config'
import { readAnalyticsConsentFromCookieHeader } from '@/lib/analytics/consent'
import { createPostHogServerRecorder } from './posthog-server-recorder'
import { deliver } from '@/lib/sinks/deliver'

export type ProCheckoutVariant = 'control' | 'value_copy'

type VariantEvaluationResult = string | boolean | null | undefined

type ResolveProCheckoutVariantOptions = {
  distinctId: string
  analyticsEnabled?: boolean
  timeoutMs?: number
  evaluate?: (distinctId: string) => Promise<VariantEvaluationResult>
}

const DEFAULT_TIMEOUT_MS = 150
const PRO_CHECKOUT_EXPERIMENT = 'pro_checkout_v1'

/**
 * GDPR gate for server-side analytics. Reads consent from the raw Cookie
 * header of the current request; fails closed (no consent) when called outside
 * a request or when the visitor has not explicitly granted consent.
 *
 * Reads the raw header rather than cookies().get() so a legacy host-scoped
 * cookie left over from before consent was shared across `.wcpos.com` cannot
 * shadow a later denial — see readAnalyticsConsentFromCookieHeader.
 */
async function hasRequestAnalyticsConsent(): Promise<boolean> {
  try {
    const headerStore = await headers()
    return (
      readAnalyticsConsentFromCookieHeader(headerStore.get('cookie')) ===
      'granted'
    )
  } catch {
    return false
  }
}

function normalizeVariant(value: VariantEvaluationResult): ProCheckoutVariant {
  if (value === 'value_copy') {
    return 'value_copy'
  }

  return 'control'
}

async function evaluateProCheckoutVariantFromPostHog(
  distinctId: string,
  timeoutMs: number
): Promise<VariantEvaluationResult> {
  const analyticsConfig = getAnalyticsConfig(process.env)
  const flagsKey = analyticsConfig.serverKey ?? analyticsConfig.key

  if (!analyticsConfig.enabled || !analyticsConfig.host || !flagsKey) {
    return 'control'
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${analyticsConfig.host}/flags?v=2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: flagsKey,
        distinct_id: distinctId,
      }),
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!response.ok) {
      return 'control'
    }

    const payload = await response.json() as {
      featureFlags?: Record<string, VariantEvaluationResult>
    }

    return payload.featureFlags?.[PRO_CHECKOUT_EXPERIMENT]
  } catch {
    return 'control'
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function resolveProCheckoutVariant({
  distinctId,
  analyticsEnabled = true,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  evaluate,
}: ResolveProCheckoutVariantOptions): Promise<ProCheckoutVariant> {
  if (!analyticsEnabled) {
    return 'control'
  }

  // GDPR: without explicit consent visitors are not bucketed into
  // experiments — they always get the default (control) variant.
  if (!(await hasRequestAnalyticsConsent())) {
    return 'control'
  }

  if (!evaluate) {
    return normalizeVariant(
      await evaluateProCheckoutVariantFromPostHog(distinctId, timeoutMs)
    )
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  try {
    const timeoutPromise = new Promise<'__timeout__'>((resolve) => {
      timeoutId = setTimeout(() => resolve('__timeout__'), timeoutMs)
    })

    const evaluation = await Promise.race([
      evaluate(distinctId),
      timeoutPromise,
    ])

    if (evaluation === '__timeout__') {
      return 'control'
    }

    return normalizeVariant(evaluation)
  } catch {
    return 'control'
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

// The server analytics recorder: the PostHog server adapter. Consent is gated
// below (not in the recorder) because the server reads it asynchronously from
// request-scoped cookies; this function is the single server consent seam.
const serverRecorder = createPostHogServerRecorder(process.env)

async function captureServerEvent(
  eventName: string,
  properties: Record<string, unknown>
): Promise<void> {
  // GDPR: no server-side capture without explicit analytics consent.
  if (!(await hasRequestAnalyticsConsent())) {
    return
  }

  const distinctId = typeof properties.distinct_id === 'string'
    ? properties.distinct_id
    : undefined

  serverRecorder.capture({ name: eventName, properties, distinctId })
}

export function trackServerEvent(
  eventName: string,
  properties: Record<string, unknown>
): Promise<void> {
  const tracked = captureServerEvent(eventName, properties)
  // Registered with the request's waitUntil here, synchronously, so callers
  // can stay fire-and-forget: on Vercel a floating promise is dropped when
  // the function freezes after the response, and the consent read above is
  // async. This covers the span up to enqueue; the SDK covers its own
  // capture POST (see posthog-node-client). The registered copy swallows
  // rejections; callers still see them on the returned promise.
  deliver(tracked.catch(() => {}))
  return tracked
}

/**
 * Capture a server event that did NOT originate from a browser request and so
 * carries no request-scoped consent cookie — e.g. the WC API Manager licence
 * shim, which the WCPOS Pro plugin calls server-to-server from a merchant's
 * wp-admin (no cookies, no consent banner).
 *
 * The request-cookie gate in `trackServerEvent` is meaningless off a browser
 * request (it always fails closed), so this path skips it. Consent is instead
 * inherited from `distinctId`: it is the landing-page anon_id, which only
 * exists because the visitor was tracked — with consent — by posthog-js on the
 * marketing site. Callers pass it only when present (no anon_id ⇒ nothing to
 * attribute ⇒ nothing to capture), so a visitor who declined analytics has no
 * id to forward and is never recorded here.
 *
 * Capture is synchronous and fire-and-forget; the posthog-node client
 * self-registers its delivery POST with the request's waitUntil (see
 * server-analytics-waitUntil), so — like `trackServerEvent` — do NOT wrap this
 * in `deliver()` at the call site. Must be invoked from within a request
 * handler; firing it from detached work would open a phantom waitUntil cycle.
 */
export function trackAttributedServerEvent(
  eventName: string,
  distinctId: string,
  properties: Record<string, unknown>
): void {
  serverRecorder.capture({ name: eventName, properties, distinctId })
}
