import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const loaded = vi.hoisted(() => ({ server: 0, edge: 0, client: 0 }))
const captureRequestError = vi.hoisted(() => vi.fn())

vi.mock('@sentry/nextjs', () => ({ captureRequestError }))
vi.mock('../sentry.server.config', () => {
  loaded.server += 1
  return {}
})
vi.mock('../sentry.edge.config', () => {
  loaded.edge += 1
  return {}
})
vi.mock('../sentry.client.config', () => {
  loaded.client += 1
  return {}
})
vi.mock('@logtape/logtape', () => ({
  configure: vi.fn().mockResolvedValue(undefined),
  getConsoleSink: vi.fn(() => () => {}),
}))
vi.mock('@/lib/sinks/loki-sink', () => ({ createLokiSink: vi.fn() }))
vi.mock('@/lib/sinks/discord-sink', () => ({ createDiscordSink: vi.fn() }))
vi.mock('@/lib/sinks/sentry-sink', () => ({ createSentrySink: vi.fn() }))
vi.mock('@/lib/sinks/email-sink', () => ({ createEmailSink: vi.fn() }))

describe('instrumentation', () => {
  beforeEach(() => {
    vi.resetModules()
    loaded.server = 0
    loaded.edge = 0
    loaded.client = 0
    vi.stubEnv('LOKI_URL', '')
    vi.stubEnv('DISCORD_WEBHOOK_URL', '')
    vi.stubEnv('SENTRY_DSN', '')
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', '')
    vi.stubEnv('RESEND_API_KEY', '')
    vi.stubEnv('ALERT_EMAIL_TO', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('loads the server config, not the edge config, on the nodejs runtime', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs')
    const { register } = await import('./instrumentation')
    await register()
    expect(loaded.server).toBe(1)
    expect(loaded.edge).toBe(0)
  })

  it('loads the edge config, not the server config, on the edge runtime', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'edge')
    const { register } = await import('./instrumentation')
    await register()
    expect(loaded.edge).toBe(1)
    expect(loaded.server).toBe(0)
  })

  it('loads neither config when NEXT_RUNTIME is unset', async () => {
    vi.stubEnv('NEXT_RUNTIME', undefined)
    const { register } = await import('./instrumentation')
    await register()
    expect(loaded.server).toBe(0)
    expect(loaded.edge).toBe(0)
  })

  it('exports Sentry.captureRequestError as onRequestError', async () => {
    const { onRequestError } = await import('./instrumentation')
    expect(onRequestError).toBe(captureRequestError)
  })

  it('does not load the client config without a DSN', async () => {
    await import('./instrumentation-client')
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(loaded.client).toBe(0)
  })

  it('loads the client config after page load when a DSN is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://public@o0.ingest.sentry.io/0')
    await import('./instrumentation-client')
    expect(loaded.client).toBe(0)
    await vi.waitFor(() => expect(loaded.client).toBe(1))
  })
})
