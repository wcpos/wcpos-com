export type PayPalEnvironment = 'production' | 'sandbox'

export type PayPalCheckoutConfig = {
  clientId: string
  environment: PayPalEnvironment
} | null

export interface CheckoutPaymentConfig {
  stripePublishableKey: string | null
  paypal: PayPalCheckoutConfig
  btcpayEnabled: boolean
}
