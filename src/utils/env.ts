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
  CHECKOUT_GATEWAY_SECRET_LIVE: z.string().min(32).optional(),
  CHECKOUT_GATEWAY_SECRET_TEST: z.string().min(32).optional(),

  // Square Terminal plugin connect relay. The client IDs are public — PKCE is
  // what makes them safe to ship — and no Square application secret is held here.
  SQUARE_CONNECT_CLIENT_ID: z.string().optional(),
  SQUARE_CONNECT_SANDBOX_CLIENT_ID: z.string().optional(),
  SQUARE_CONNECT_STATE_SECRET: z.string().min(32).optional(),

  // Stripe (client-side publishable key)
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

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
  // Locked #member-directory channel (owner + bot); directory ships dark without it.
  DISCORD_DIRECTORY_CHANNEL_ID: z.string().optional(),
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

  // Cloudflare Turnstile (bot protection for the public support box).
  // The site key's source of truth is the committed host-resolved literal in
  // src/lib/support/turnstile-keys.ts; this env var is a rotation OVERRIDE
  // only (honoured on live hosts when it looks like a real 0x… widget key,
  // and only on remote builds — prebuilt deploys bake it empty).
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),

  // Upstash Redis (per-IP rate limit + daily budget ceiling for the support box)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  SUPPORT_DAILY_QUESTION_BUDGET: z.coerce.number().int().positive().default(500),

  // Vercel deploy environment ('production' | 'preview' | 'development'), set
  // by the platform during builds. Used to require deploy-critical secrets on
  // the real production build without affecting local `next build` (which sets
  // NODE_ENV=production but leaves VERCEL_ENV unset).
  VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),

  // Node environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
})

/**
 * Secrets that MUST be present on a real Vercel production deploy. Missing one
 * fails the production BUILD (deploy is blocked) rather than silently shipping
 * and 500ing every customer at request time. Gated on VERCEL_ENV === 'production'
 * so local/preview/test builds are never blocked.
 *
 * DOWNLOAD_TOKEN_SECRET is the HMAC signing key for Pro-download tokens; without
 * it both /api/account/download(s) routes fail closed. On 2026-07-05 it was
 * never provisioned on Vercel → every Pro download 500'd. This turns that
 * request-time fatal into a deploy-time failure. CRON_SECRET lets Vercel
 * authenticate scheduled requests (the reconcile route rejects every run
 * without it). The Redis credentials and Turnstile secret likewise keep
 * protected mutation controls available. Both checkout gateway secrets keep
 * the host-keyed live and test payment-session paths deployable and isolated.
 */
const REQUIRED_ON_PRODUCTION = [
  'CHECKOUT_GATEWAY_SECRET_LIVE',
  'CHECKOUT_GATEWAY_SECRET_TEST',
  'CRON_SECRET',
  'DOWNLOAD_TOKEN_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'TURNSTILE_SECRET_KEY',
] as const

const envSchemaWithProdGuards = envSchema.superRefine((data, ctx) => {
  if (data.VERCEL_ENV !== 'production') return
  for (const key of REQUIRED_ON_PRODUCTION) {
    if (!data[key]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} is required on Vercel production deploys`,
      })
    }
  }
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
  const parsed = envSchemaWithProdGuards.safeParse(definedEnvEntries(process.env))

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten())
    throw new Error('Invalid environment variables')
  }

  return parsed.data
}

export const env = validateEnv()
