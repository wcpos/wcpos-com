import { describe, it, expect, vi, afterEach } from 'vitest'
import { definedEnvEntries } from './env'

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

  it('fails the build when DOWNLOAD_TOKEN_SECRET is missing on a Vercel production deploy', async () => {
    // 2026-07-05 incident: the secret was never provisioned, so every Pro
    // download 500'd at request time. This turns it into a deploy failure.
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('DOWNLOAD_TOKEN_SECRET', '') // '' is stripped to unset
    vi.resetModules()

    await expect(import('./env')).rejects.toThrow(
      'Invalid environment variables',
    )
  })

  it('passes when DOWNLOAD_TOKEN_SECRET is present on a Vercel production deploy', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('DOWNLOAD_TOKEN_SECRET', 'a-signing-secret')
    vi.resetModules()

    await expect(import('./env')).resolves.toHaveProperty('env')
  })

  it('does not require the secret on non-production deploys (preview/local)', async () => {
    // next build sets NODE_ENV=production locally but leaves VERCEL_ENV unset;
    // preview deploys set VERCEL_ENV=preview. Neither should be blocked.
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('DOWNLOAD_TOKEN_SECRET', '')
    vi.resetModules()

    await expect(import('./env')).resolves.toHaveProperty('env')
  })
})
