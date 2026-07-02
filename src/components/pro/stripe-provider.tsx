'use client'

import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import type { ReactNode } from 'react'

// Load Stripe outside of component to avoid recreating on every render
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

interface StripeProviderProps {
  children: ReactNode
  clientSecret?: string
}

export function StripeProvider({ children, clientSecret }: StripeProviderProps) {
  if (!stripePromise) {
    return (
      <div className="text-center text-muted-foreground p-4">
        Stripe is not configured. Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
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
    <Elements key={clientSecret} stripe={stripePromise} options={options}>
      {children}
    </Elements>
  )
}
