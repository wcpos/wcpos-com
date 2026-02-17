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

function normalizeVariant(value: VariantEvaluationResult): ProCheckoutVariant {
  if (value === 'value_copy') {
    return 'value_copy'
  }

  return 'control'
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

  const evaluateVariant = evaluate ?? (async () => 'control')

  try {
    const timeoutPromise = new Promise<'__timeout__'>((resolve) => {
      setTimeout(() => resolve('__timeout__'), timeoutMs)
    })

    const evaluation = await Promise.race([
      evaluateVariant(distinctId),
      timeoutPromise,
    ])

    if (evaluation === '__timeout__') {
      return 'control'
    }

    return normalizeVariant(evaluation)
  } catch {
    return 'control'
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

  await fetch(`${analyticsConfig.host}/capture/`, {
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
  })
}
