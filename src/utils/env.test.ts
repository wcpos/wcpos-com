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
