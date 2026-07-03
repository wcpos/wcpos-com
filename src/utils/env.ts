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
  // .min(1): reject an empty string so an empty value can never satisfy the
  // /api/debug/alert-test production guard (token !== '' would otherwise pass).
  ALERT_TEST_TOKEN: z.string().min(1).optional(),

  // Owner alert email (Resend REST). Fatal-tier logs are also emailed so a
  // missed Discord ping can't hide a paid-but-no-license / broken-checkout
  // incident. ALERT_EMAIL_TO may be a comma-separated list. All optional — the
  // email sink is simply not registered when the key/recipient are unset.
  RESEND_API_KEY: z.string().optional(),
  ALERT_EMAIL_TO: z.string().optional(),
  ALERT_EMAIL_FROM: z.string().default('WCPOS Alerts <noreply@wcpos.com>'),

  // Error tracking
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

  // Client-side logging configuration
  NEXT_PUBLIC_LOG_LEVEL: z.enum(['debug', 'info', 'warning', 'error', 'fatal']).optional(),

  // openclaw model-gateway (server-side support assistant)
  OPENCLAW_GATEWAY_URL: z.string().url().default('https://openclaw.wcpos.com'),
  OPENCLAW_TOKEN: z.string().optional(),

  // Cloudflare Turnstile (bot protection for the public support box)
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),

  // Upstash Redis (per-IP rate limit + daily budget ceiling for the support box)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  SUPPORT_DAILY_QUESTION_BUDGET: z.coerce.number().int().positive().default(500),

  // Node environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
})

/**
 * Treat empty-string variables as unset before validation. Platform
 * dashboards (Vercel) persist a cleared variable as "", which is "present"
 * to zod — so an optional `.url()`/`.min(1)` field rejects it and the build
 * dies. Took production deploys down on 2026-07-02 when placeholder alerting
 * vars (LOKI_URL, DISCORD_WEBHOOK_URL, …) were saved empty. Genuinely
 * malformed non-empty values still fail loudly.
 *
 * NODE_ENV is exempt: a blank NODE_ENV must fail the enum rather than fall
 * back to the 'development' default — security-sensitive code fail-opens on
 * `env.NODE_ENV !== 'production'` (e.g. the Turnstile guard).
 */
const KEEP_EMPTY = new Set(['NODE_ENV'])

export function definedEnvEntries(
  source: Record<string, string | undefined>,
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(source).filter(
      ([key, value]) => value !== '' || KEEP_EMPTY.has(key),
    ),
  )
}

function validateEnv() {
  const parsed = envSchema.safeParse(definedEnvEntries(process.env))

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten())
    throw new Error('Invalid environment variables')
  }

  return parsed.data
}

export const env = validateEnv()
