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

  // PostHog analytics / experiments
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  POSTHOG_API_KEY: z.string().optional(),

  // Admin area allowlist (comma-separated emails, case-insensitive).
  // Unset or empty means nobody is admin (fail closed).

  // Keygen License Server
  KEYGEN_HOST: z.string().default('license.wcpos.com'),
  KEYGEN_API_TOKEN: z.string().optional(),
  DOWNLOAD_TOKEN_SECRET: z.string().optional(),
  // Keygen policy ids per plan (NEXT_PUBLIC_ so the account badge — a client
  // component — can map a license's policyId to its plan). Yearly defaults to
  // the known UUID in src/lib/plans.ts; Lifetime MUST be set per environment
  // (its UUID is not hardcoded). Not secrets.
  NEXT_PUBLIC_KEYGEN_YEARLY_POLICY_ID: z.string().optional(),
  NEXT_PUBLIC_KEYGEN_LIFETIME_POLICY_ID: z.string().optional(),

  // Discord Pro role sync
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DISCORD_BOT_TOKEN: z.string().optional(),
  DISCORD_GUILD_ID: z.string().optional(),
  DISCORD_PRO_ROLE_ID: z.string().optional(),
  DISCORD_PUBLIC_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  MEDUSA_ADMIN_API_TOKEN: z.string().optional(),

  // Logging
  LOKI_URL: z.string().url().optional(),
  LOKI_API_KEY: z.string().optional(),
  DISCORD_WEBHOOK_URL: z.string().url().optional(),

  // Error tracking
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

  // Client-side logging configuration
  NEXT_PUBLIC_LOG_LEVEL: z.enum(['debug', 'info', 'warning', 'error', 'fatal']).optional(),

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
