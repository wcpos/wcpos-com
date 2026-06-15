import 'server-only'
import { cookies } from 'next/headers'
import { getAnalyticsConfig } from '@/lib/analytics/config'
import {
  ANALYTICS_CONSENT_COOKIE,
  hasAnalyticsConsent,
} from '@/lib/analytics/consent'
import { getPostHogServerClient } from '@/services/core/external/posthog-node-client'

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
 * GDPR gate for server-side analytics. Reads the consent cookie from the
 * current request scope; fails closed (no consent) when called outside a
 * request or when the visitor has not explicitly granted consent.
 */
async function hasRequestAnalyticsConsent(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    return hasAnalyticsConsent(cookieStore.get(ANALYTICS_CONSENT_COOKIE)?.value)
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

export async function trackServerEvent(
  eventName: string,
  properties: Record<string, unknown>
): Promise<void> {
  // GDPR: no server-side capture without explicit analytics consent.
  if (!(await hasRequestAnalyticsConsent())) {
    return
  }

  const ph = getPostHogServerClient(process.env)
  if (!ph) return

  const distinctId = typeof properties.distinct_id === 'string'
    ? properties.distinct_id
    : 'wcpos-server-event'

  ph.capture({ distinctId, event: eventName, properties })
}
