'use client'

import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import type { ReactNode } from 'react'

// One Stripe.js instance per publishable key (live on wcpos.com, test on
// beta — see store-environment.ts). Cached at module scope so re-renders
// never re-create the SDK instance.
const stripePromises = new Map<string, Promise<Stripe | null>>()

function getStripePromise(publishableKey: string): Promise<Stripe | null> {
  let promise = stripePromises.get(publishableKey)
  if (!promise) {
    promise = loadStripe(publishableKey)
    stripePromises.set(publishableKey, promise)
  }
  return promise
}

interface StripeProviderProps {
  children: ReactNode
  clientSecret?: string
  /** Host-resolved public key; null renders the not-configured notice. */
  publishableKey: string | null
}

export function StripeProvider({
  children,
  clientSecret,
  publishableKey,
}: StripeProviderProps) {
  if (!publishableKey) {
    return (
      <div className="text-center text-muted-foreground p-4">
        Stripe is not configured for this environment.
      </div>
    )
  }

  const options = clientSecret
    ? {
        clientSecret,
        appearance: {
          theme: 'stripe' as const,
          variables: {
            colorPrimary: '#0f172a',
          },
        },
      }
    : undefined

  return (
    // Keyed by client secret: Elements ignores clientSecret changes after
    // mount, so a refreshed payment session (e.g. after a billing edit)
    // must remount rather than leave the form confirming a stale intent.
    <Elements
      key={clientSecret}
      stripe={getStripePromise(publishableKey)}
      options={options}
    >
      {children}
    </Elements>
  )
}
