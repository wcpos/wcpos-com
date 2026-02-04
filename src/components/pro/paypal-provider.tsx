'use client'

import { PayPalScriptProvider } from '@paypal/react-paypal-js'
import type { ReactNode } from 'react'

interface PayPalProviderProps {
  children: ReactNode
}

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

export function PayPalProvider({ children }: PayPalProviderProps) {
  if (!PAYPAL_CLIENT_ID) {
    // PayPal not configured - render children without provider
    return <>{children}</>
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: PAYPAL_CLIENT_ID,
        currency: 'USD',
        intent: 'capture',
      }}
    >
      {children}
    </PayPalScriptProvider>
  )
}

export function isPayPalConfigured(): boolean {
  return Boolean(PAYPAL_CLIENT_ID)
}
