import { CHECKOUT_FAILURE_KINDS } from '@/lib/checkout-failure-taxonomy'
import { parseCheckoutLocale } from './checkout-attribution'

const PAYMENT_PROVIDERS = ['stripe', 'paypal', 'btcpay'] as const
const CHECKOUT_PLANS = ['yearly', 'lifetime'] as const
const CHECKOUT_EXPERIMENTS = ['pro_checkout_v1', 'license_renewal'] as const
const CHECKOUT_VARIANTS = ['control', 'value_copy'] as const

export type CheckoutPaymentProvider = (typeof PAYMENT_PROVIDERS)[number]

interface CheckoutPaymentEventInput {
  paymentProvider: unknown
  failureKind?: unknown
  plan?: unknown
  experiment?: unknown
  variant?: unknown
  locale?: unknown
  [key: string]: unknown
}

function includes<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && values.includes(value as T)
}

/**
 * The sole browser checkout-payment event property builder. It enumerates the
 * privacy-reviewed allowlist rather than spreading caller input, so provider
 * errors, support references, and commerce identifiers cannot cross this seam.
 */
export function buildCheckoutPaymentEventProperties(
  input: CheckoutPaymentEventInput
): Record<string, string> {
  const properties: Record<string, string> = {
    payment_provider: includes(PAYMENT_PROVIDERS, input.paymentProvider)
      ? input.paymentProvider
      : 'unknown',
  }

  if (includes(CHECKOUT_FAILURE_KINDS, input.failureKind)) {
    properties.failure_kind = input.failureKind
  }
  if (includes(CHECKOUT_PLANS, input.plan)) {
    properties.plan = input.plan
  }
  if (includes(CHECKOUT_EXPERIMENTS, input.experiment)) {
    properties.experiment = input.experiment
  }
  if (includes(CHECKOUT_VARIANTS, input.variant)) {
    properties.variant = input.variant
  }

  const locale = parseCheckoutLocale(input.locale)
  if (locale) properties.locale = locale

  return properties
}
