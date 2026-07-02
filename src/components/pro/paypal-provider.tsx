'use client'

import { PayPalScriptProvider } from '@paypal/react-paypal-js'
import type { ReactNode } from 'react'

interface PayPalProviderProps {
  children: ReactNode
  /**
   * Host-resolved public client id (live on wcpos.com, sandbox on beta —
   * see store-environment.ts). Null renders children without the provider.
   */
  clientId: string | null
}

export function PayPalProvider({ children, clientId }: PayPalProviderProps) {
  if (!clientId) {
    // PayPal not configured - render children without provider
    return <>{children}</>
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: 'USD',
        intent: 'capture',
      }}
    >
      {children}
    </PayPalScriptProvider>
  )
}
