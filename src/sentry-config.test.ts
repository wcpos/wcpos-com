import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const init = vi.hoisted(() => vi.fn())

vi.mock('@sentry/nextjs', () => ({ init, captureRequestError: vi.fn() }))

const configs = {
  client: () => import('../sentry.client.config'),
  server: () => import('../sentry.server.config'),
  edge: () => import('../sentry.edge.config'),
}

const DSN = 'https://public@o0.ingest.sentry.io/0'

describe('Sentry configs', () => {
  beforeEach(() => {
    vi.resetModules()
    init.mockClear()
    vi.stubEnv('SENTRY_DSN', '')
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each(Object.entries(configs))('%s config does not init Sentry without a DSN', async (_name, load) => {
    await load()
    expect(init).not.toHaveBeenCalled()
  })

  it('client config sends masked errors only', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', DSN)
    await configs.client()
    expect(init).toHaveBeenCalledTimes(1)
    const options = init.mock.calls[0][0]
    for (const key of ['integrations', 'tracesSampleRate', 'replaysSessionSampleRate', 'replaysOnErrorSampleRate']) {
      expect(options).not.toHaveProperty(key)
    }
    const message = 'jane@example.com +61 412 345 678'
    const event = options.beforeSend({ message, exception: { values: [{ value: `Error: ${message}` }] } }, {})
    expect(event.message).toBe('[EMAIL] [PHONE]')
    expect(event.exception.values[0].value).toBe('Error: [EMAIL] [PHONE]')
    expect(options.beforeBreadcrumb({ message: 'call +61 412 345 678' }, {})).toEqual({ message: 'call [PHONE]' })
  })

  it.each([
    ['server', configs.server],
    ['edge', configs.edge],
  ])('%s config masks email without tracing or profiling', async (_name, load) => {
    vi.stubEnv('SENTRY_DSN', DSN)
    await load()
    expect(init).toHaveBeenCalledTimes(1)
    const options = init.mock.calls[0][0]
    expect(options).not.toHaveProperty('tracesSampleRate')
    expect(options).not.toHaveProperty('profilesSampleRate')
    expect(options.beforeSend({ message: 'jane@example.com failed' }, {}).message).toBe('[EMAIL] failed')
    expect(options.beforeBreadcrumb({ message: 'jane@example.com' }, {})).toEqual({ message: '[EMAIL]' })
  })
})
