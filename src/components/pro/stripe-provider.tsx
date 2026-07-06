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
  /**
   * Stripe CustomerSession client secret. When present, the Payment Element
   * renders Stripe's optional "save payment details" checkbox (with its
   * card-network-compliant off-session mandate). Absent → no checkbox. Must be
   * supplied at mount alongside clientSecret — Elements ignores option changes
   * afterwards.
   */
  customerSessionClientSecret?: string | null
  /** Host-resolved public key; null renders the not-configured notice. */
  publishableKey: string | null
}

export function StripeProvider({
  children,
  clientSecret,
  customerSessionClientSecret,
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
        ...(customerSessionClientSecret
          ? { customerSessionClientSecret }
          : {}),
        appearance: {
          theme: 'stripe' as const,
          variables: {
            colorPrimary: '#0f172a',
          },
          // The payment method is already chosen and framed by the checkout's
          // own method row, so strip the Element's own card/accordion chrome —
          // no border, shadow, or inset padding — leaving just the fields.
          // Avoids the "box within a box" the outer row would otherwise nest.
          rules: {
            '.AccordionItem': {
              border: 'none',
              boxShadow: 'none',
              padding: '0',
            },
            '.Block': {
              border: 'none',
              boxShadow: 'none',
              padding: '0',
            },
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
