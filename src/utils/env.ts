import { z } from 'zod'

/**
 * Environment variable validation
 * Ensures required env vars are present at runtime
 */
const envSchema = z.object({
  // GitHub App authentication
  GITHUB_APP_ID: z.coerce.number().optional(),
  GITHUB_PRIVATE_KEY: z.string().optional(),
  GITHUB_INSTALLATION_ID: z.coerce.number().optional(),

  // GitHub Project (for roadmap page)
  GITHUB_PROJECT_NUMBER: z.coerce.number().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),

  // Medusa Store API
  MEDUSA_BACKEND_URL: z.string().default('https://store-api.wcpos.com'),
  MEDUSA_PUBLISHABLE_KEY: z.string().optional(),

  // Stripe (client-side publishable key)
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // PayPal (client-side client ID)
  NEXT_PUBLIC_PAYPAL_CLIENT_ID: z.string().optional(),

  // BTCPayServer (enabled flag - actual server URL is handled by Medusa)
  NEXT_PUBLIC_BTCPAY_ENABLED: z.string().optional(),

  // Keygen License Server
  KEYGEN_HOST: z.string().default('license.wcpos.com'),
  KEYGEN_API_TOKEN: z.string().optional(),

  // Logging
  LOKI_URL: z.string().url().optional(),
  LOKI_API_KEY: z.string().optional(),
  DISCORD_WEBHOOK_URL: z.string().url().optional(),

  // Node environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
})

function validateEnv() {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten())
    throw new Error('Invalid environment variables')
  }

  return parsed.data
}

export const env = validateEnv()

