import { supportedCanonicalLocale } from '@/lib/locale-preferences'

export const CHECKOUT_ATTRIBUTION_OWNER = 'medusa_v1'

export type CheckoutExperiment = 'pro_checkout_v1' | 'license_renewal'
export type CheckoutVariant = 'control' | 'value_copy'

type CheckoutAttributionInput = {
  consentedDistinctId?: unknown
  sessionId?: unknown
  locale?: unknown
  experiment?: unknown
  variant?: unknown
}

type CheckoutAttributionMetadata = {
  wcpos_analytics: {
    completion_owner: typeof CHECKOUT_ATTRIBUTION_OWNER
    distinct_id: string
    session_id?: string
    locale?: string
    experiment?: CheckoutExperiment
    variant?: CheckoutVariant
  }
}

const MAX_CONTEXT_STRING_LENGTH = 256
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[47][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function parseUuid(value: unknown, version: '4' | '7'): string | undefined {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > MAX_CONTEXT_STRING_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    !UUID_PATTERN.test(value) ||
    value[14] !== version
  ) {
    return undefined
  }

  return value
}

export function parsePostHogSessionId(value: unknown): string | undefined {
  return parseUuid(value, '7')
}

export function parseCheckoutLocale(value: unknown): string | undefined {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > MAX_CONTEXT_STRING_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return undefined
  }

  return supportedCanonicalLocale(value)
}

export function parseCheckoutExperiment(
  value: unknown
): CheckoutExperiment | undefined {
  return value === 'pro_checkout_v1' || value === 'license_renewal'
    ? value
    : undefined
}

export function parseCheckoutVariant(
  value: unknown
): CheckoutVariant | undefined {
  return value === 'control' || value === 'value_copy' ? value : undefined
}

/**
 * Builds the only cart-metadata namespace Medusa may treat as authoritative.
 * The distinct ID parameter is deliberately named for its trust boundary: API
 * callers must source it from the consent-gated server cookie, never JSON.
 */
export function buildCheckoutAttributionMetadata({
  consentedDistinctId,
  sessionId,
  locale,
  experiment,
  variant,
}: CheckoutAttributionInput): CheckoutAttributionMetadata | undefined {
  const distinctId = parseUuid(consentedDistinctId, '4')
  if (!distinctId) return undefined

  const parsedSessionId = parsePostHogSessionId(sessionId)
  if (sessionId !== undefined && !parsedSessionId) return undefined

  const parsedLocale = parseCheckoutLocale(locale)
  const parsedExperiment = parseCheckoutExperiment(experiment)
  const parsedVariant = parseCheckoutVariant(variant)

  return {
    wcpos_analytics: {
      completion_owner: CHECKOUT_ATTRIBUTION_OWNER,
      distinct_id: distinctId,
      ...(parsedSessionId ? { session_id: parsedSessionId } : {}),
      ...(parsedLocale ? { locale: parsedLocale } : {}),
      ...(parsedExperiment ? { experiment: parsedExperiment } : {}),
      ...(parsedVariant ? { variant: parsedVariant } : {}),
    },
  }
}
