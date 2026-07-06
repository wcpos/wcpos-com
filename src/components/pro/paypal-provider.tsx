'use client'

import { PayPalProvider as PayPalSdkV6Provider } from '@paypal/react-paypal-js/sdk-v6'
import type { ReactNode } from 'react'
import type { PayPalCheckoutConfig } from '@/lib/checkout-payment-config'

interface PayPalProviderProps {
  children: ReactNode
  /**
   * Host-resolved public client id (live on wcpos.com, sandbox on beta —
   * see store-environment.ts). Null renders children without the provider.
   */
  config: PayPalCheckoutConfig
}

export function PayPalProvider({
  children,
  config,
}: PayPalProviderProps) {
  if (!config) {
    // PayPal not configured - render children without provider
    return <>{children}</>
  }

  return (
    <PayPalSdkV6Provider
      clientId={config.clientId}
      environment={config.environment}
      components={['paypal-payments']}
      pageType="checkout"
    >
      {children}
    </PayPalSdkV6Provider>
  )
}
