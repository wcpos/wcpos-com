import { describe, it, expect, vi, afterEach } from 'vitest'
import { definedEnvEntries } from './env'

const REQUIRED_PRODUCTION_ENV = {
  CHECKOUT_GATEWAY_SECRET_LIVE: 'checkout-live-gateway-secret-at-least-32-chars',
  CHECKOUT_GATEWAY_SECRET_TEST: 'checkout-test-gateway-secret-at-least-32-chars',
  CRON_SECRET: 'a-cron-secret',
  DOWNLOAD_TOKEN_SECRET: 'a-signing-secret',
  UPSTASH_REDIS_REST_URL: 'https://redis.example.com',
  UPSTASH_REDIS_REST_TOKEN: 'a-redis-token',
  TURNSTILE_SECRET_KEY: 'a-turnstile-secret',
} as const

function stubRequiredProductionEnv() {
  vi.stubEnv('VERCEL_ENV', 'production')
  for (const [key, value] of Object.entries(REQUIRED_PRODUCTION_ENV)) {
    vi.stubEnv(key, value)
  }
}

describe('definedEnvEntries', () => {
  it('drops empty-string variables and keeps everything else', () => {
    expect(
      definedEnvEntries({
        LOKI_URL: '',
        DISCORD_WEBHOOK_URL: '',
        MEDUSA_BACKEND_URL: 'https://store-api.wcpos.com',
        UNSET: undefined,
      }),
    ).toEqual({
      MEDUSA_BACKEND_URL: 'https://store-api.wcpos.com',
      UNSET: undefined,
    })
  })
})

describe('env validation with empty-string platform variables', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('does not reject optional url/min(1) fields saved as "" (2026-07-02 deploy outage)', async () => {
    // Vercel persists cleared variables as empty strings; these exact four
    // took down production builds when saved as placeholders.
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', '')
    vi.stubEnv('LOKI_URL', '')
    vi.stubEnv('DISCORD_WEBHOOK_URL', '')
    vi.stubEnv('ALERT_TEST_TOKEN', '')
    vi.resetModules()

    await expect(import('./env')).resolves.toHaveProperty('env')
  })

  it('still fails loudly on genuinely malformed non-empty values', async () => {
    vi.stubEnv('LOKI_URL', 'not-a-url')
    vi.resetModules()

    await expect(import('./env')).rejects.toThrow(
      'Invalid environment variables',
    )
  })

  it('keeps a blank NODE_ENV strict instead of defaulting to development', async () => {
    // Security-sensitive code fail-opens on NODE_ENV !== 'production'; a
    // blank platform value must fail the build, not become 'development'.
    vi.stubEnv('NODE_ENV', '')
    vi.resetModules()

    await expect(import('./env')).rejects.toThrow(
      'Invalid environment variables',
    )
  })
})

describe('production deploy-critical secret guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it.each(Object.keys(REQUIRED_PRODUCTION_ENV))(
    'fails the build when %s is missing on a Vercel production deploy',
    async (missingKey) => {
      stubRequiredProductionEnv()
      vi.stubEnv(missingKey, '') // '' is stripped to unset
      vi.resetModules()

      await expect(import('./env')).rejects.toThrow(
        'Invalid environment variables',
      )
    },
  )

  it('passes when all deploy-critical variables are present on a Vercel production deploy', async () => {
    stubRequiredProductionEnv()
    vi.resetModules()

    await expect(import('./env')).resolves.toHaveProperty('env')
  })

  it.each(['CHECKOUT_GATEWAY_SECRET_LIVE', 'CHECKOUT_GATEWAY_SECRET_TEST'])(
    'rejects %s when it is shorter than 32 characters',
    async (key) => {
      vi.stubEnv(key, 'too-short')
      vi.resetModules()

      await expect(import('./env')).rejects.toThrow(
        'Invalid environment variables',
      )
    }
  )

  it('does not require deploy-critical variables on non-production deploys', async () => {
    // next build sets NODE_ENV=production locally but leaves VERCEL_ENV unset;
    // preview deploys set VERCEL_ENV=preview. Neither should be blocked.
    vi.stubEnv('VERCEL_ENV', 'preview')
    for (const key of Object.keys(REQUIRED_PRODUCTION_ENV)) {
      vi.stubEnv(key, '')
    }
    vi.resetModules()

    await expect(import('./env')).resolves.toHaveProperty('env')
  })
})
