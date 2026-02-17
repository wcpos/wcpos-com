import 'server-only'
import { getAnalyticsConfig } from '@/lib/analytics/config'

export type ProCheckoutVariant = 'control' | 'value_copy'

type VariantEvaluationResult = string | boolean | null | undefined

type ResolveProCheckoutVariantOptions = {
  distinctId: string
  analyticsEnabled?: boolean
  timeoutMs?: number
  evaluate?: (distinctId: string) => Promise<VariantEvaluationResult>
}

const DEFAULT_TIMEOUT_MS = 150
const TRACK_TIMEOUT_MS = 1500
const PRO_CHECKOUT_EXPERIMENT = 'pro_checkout_v1'

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
  const analyticsConfig = getAnalyticsConfig(process.env)
  const captureKey = analyticsConfig.serverKey ?? analyticsConfig.key

  if (!analyticsConfig.enabled || !analyticsConfig.host || !captureKey) {
    return
  }

  const distinctId = typeof properties.distinct_id === 'string'
    ? properties.distinct_id
    : 'wcpos-server-event'

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TRACK_TIMEOUT_MS)

  void fetch(`${analyticsConfig.host}/capture/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: captureKey,
      event: eventName,
      distinct_id: distinctId,
      properties,
    }),
    signal: controller.signal,
  })
    .catch(() => undefined)
    .finally(() => {
      clearTimeout(timeoutId)
    })
}
