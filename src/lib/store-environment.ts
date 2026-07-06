import 'server-only'

import { headers } from 'next/headers'
import type {
  CheckoutPaymentConfig,
  PayPalCheckoutConfig,
  PayPalEnvironment,
} from './checkout-payment-config'

/**
 * Host-keyed store environments — config in code, git as the flip mechanism.
 *
 * wcpos.com serves LIVE money; beta.wcpos.com (and Vercel previews) serve the
 * staging backend with test-mode payment providers; localhost serves the
 * dev/e2e setup. One build carries all three: every value in this table is
 * public by design (publishable keys, client ids, URLs — never secrets), so
 * nothing here needs an environment variable and no deploy ever flips one.
 *
 * Fail-safe direction: an unknown host can never reach live — only the
 * canonical production hostnames resolve to the live environment.
 *
 * Server-only on purpose: client components receive the resolved environment
 * as props from a server component (the host is a request-time fact; module
 * scope in the client bundle cannot know it without hydration mismatches).
 */

export type StoreEnvironmentName = 'live' | 'test' | 'dev'

export interface StoreEnvironment {
  name: StoreEnvironmentName
  medusaBackendUrl: string
  medusaPublishableKey: string | null
  /** Public payment identifiers passed to the checkout client. */
  payments: CheckoutPaymentConfig
}

function stripePublishableKey(value: string | undefined): string | null {
  const candidate = value?.trim()
  if (!candidate) return null

  return candidate.startsWith('pk_') ? candidate : null
}

function liveStripePublishableKey(value: string | undefined): string | null {
  const candidate = stripePublishableKey(value)
  return candidate?.startsWith('pk_live_') ? candidate : null
}

function paypalCheckoutConfig(
  clientId: string | undefined,
  environment: PayPalEnvironment
): PayPalCheckoutConfig {
  const candidate = clientId?.trim()
  return candidate ? { clientId: candidate, environment } : null
}

// Public live Stripe publishable key. Publishable keys are safe to commit and
// are rendered into client HTML by design (unlike sk_ secret keys). It lives in
// code — not a Vercel env var — because an empty NEXT_PUBLIC_STRIPE_PUBLISHABLE_
// KEY on Vercel silently nulled Stripe (the only registered payment method) and
// produced "No payment methods are configured" in production more than once.
// Git is the flip mechanism; the env var, when set to a valid pk_live_ value, still
// overrides for key rotation without a redeploy (anything else — empty, sk_,
// junk — is ignored in favour of this literal).
const LIVE_STRIPE_PUBLISHABLE_KEY = 'pk_live_KlgLwN0RGeiWCv3yx6qjv4ef'

// TODO(launch): commit the live PayPal client id + live Medusa publishable key
// as literals too (same rationale as the Stripe key above), retiring their
// env-var fallbacks. Stripe is done.
const STORE_ENVIRONMENTS: Record<StoreEnvironmentName, StoreEnvironment> = {
  live: {
    name: 'live',
    medusaBackendUrl: 'https://store-api.wcpos.com',
    medusaPublishableKey: process.env.MEDUSA_PUBLISHABLE_KEY ?? null,
    payments: {
      stripePublishableKey:
        liveStripePublishableKey(
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        ) ?? liveStripePublishableKey(LIVE_STRIPE_PUBLISHABLE_KEY),
      paypal: paypalCheckoutConfig(
        process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
        'production'
      ),
      btcpayEnabled: Boolean(process.env.NEXT_PUBLIC_BTCPAY_ENABLED),
    },
  },
  test: {
    name: 'test',
    medusaBackendUrl: 'https://store-api-staging.wcpos.com',
    // Staging Medusa "Default Publishable API Key" (apk_01KHAY67JDMAE75CVE6AK7WKG6).
    medusaPublishableKey:
      'pk_399c0c1ca328579dc9055be3c3c29c640953d1b585c76803164aeea4029025e9',
    payments: {
      stripePublishableKey: stripePublishableKey(
        process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY
      ),
      paypal: null,
      btcpayEnabled: true,
    },
  },
  // Local development and the mocked e2e suite. The Medusa URL keeps the
  // existing env override (a test input, not configuration): the e2e harness
  // pins it to the host its fetch interceptor rewrites.
  dev: {
    name: 'dev',
    medusaBackendUrl:
      process.env.MEDUSA_BACKEND_URL ?? 'https://store-api-staging.wcpos.com',
    medusaPublishableKey: process.env.MEDUSA_PUBLISHABLE_KEY ?? null,
    payments: {
      stripePublishableKey: stripePublishableKey(
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      ),
      paypal: null,
      // BTCPay is a plain redirect (no client SDK), so the mocked suite can
      // exercise a full payment method end-to-end.
      btcpayEnabled: true,
    },
  },
}

const LIVE_HOSTNAMES = new Set(['wcpos.com', 'www.wcpos.com'])
const TEST_HOSTNAME_SUFFIXES = ['.vercel.app']
const TEST_HOSTNAMES = new Set(['beta.wcpos.com'])

/** Pure host → environment mapping (exported for tests). */
export function resolveStoreEnvironmentName(
  host: string | null | undefined
): StoreEnvironmentName {
  const hostname = (host ?? '').trim().toLowerCase().split(':')[0]

  if (LIVE_HOSTNAMES.has(hostname)) return 'live'
  if (TEST_HOSTNAMES.has(hostname)) return 'test'
  if (TEST_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    return 'test'
  }
  return 'dev'
}

export function getStoreEnvironmentByName(
  name: StoreEnvironmentName
): StoreEnvironment {
  return STORE_ENVIRONMENTS[name]
}

/**
 * Resolve the environment for the current request. Request-scoped (reads
 * headers), so it cannot be called inside 'use cache' — cached functions
 * take the environment (or its name, as the cache key) as an argument,
 * resolved by their dynamic caller.
 */
export async function getRequestStoreEnvironment(): Promise<StoreEnvironment> {
  const headerList = await headers()
  return getStoreEnvironmentByName(
    resolveStoreEnvironmentName(headerList.get('host'))
  )
}

/**
 * Public marketing surfaces (home price teaser, JSON-LD) are prerendered
 * into one host-agnostic static shell — they always show live prices.
 * Background jobs (Discord role-sync, alert webhooks) also operate on live
 * business data and have no meaningful request host.
 */
export function getLiveStoreEnvironment(): StoreEnvironment {
  return STORE_ENVIRONMENTS.live
}

/** Request-scoped shorthand for the host-resolved Medusa base URL. */
export async function getMedusaBackendUrl(): Promise<string> {
  return (await getRequestStoreEnvironment()).medusaBackendUrl
}

/** Request-scoped shorthand for the host-resolved publishable key ('' when unset). */
export async function getMedusaPublishableKey(): Promise<string> {
  return (await getRequestStoreEnvironment()).medusaPublishableKey ?? ''
}
