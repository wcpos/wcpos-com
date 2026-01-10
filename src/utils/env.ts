import { z } from 'zod'

/**
 * Environment variable validation
 * Ensures required env vars are present at runtime
 */
const envSchema = z.object({
  // GitHub Personal Access Token (optional but recommended for higher rate limits)
  GITHUB_PAT: z.string().optional(),

  // Medusa Store API
  MEDUSA_BACKEND_URL: z.string().default('https://store-api.wcpos.com'),
  MEDUSA_PUBLISHABLE_KEY: z.string().optional(),

  // Stripe (client-side publishable key)
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

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

