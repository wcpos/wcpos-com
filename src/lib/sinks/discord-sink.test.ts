import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDiscordSink } from './discord-sink'
import { stubVercelRequestContext } from '@/test/vercel-request-context'
import type { LogRecord } from '@logtape/logtape'

function record(category: string[]): LogRecord {
  return {
    category, level: 'error', message: ['boom'], properties: {},
    timestamp: 0, rawMessage: 'boom',
  } as unknown as LogRecord
}

describe('createDiscordSink rate limiting', () => {
  beforeEach(() => { vi.restoreAllMocks(); vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true }))) })

  it('rate-limits ordinary categories within the window', () => {
    const sink = createDiscordSink({ webhookUrl: 'https://x', rateLimitMs: 30_000 })
    sink(record(['wcpos', 'store']))
    sink(record(['wcpos', 'store']))
    expect((fetch as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1)
  })

  it('never rate-limits a category under alwaysSendPrefixes', () => {
    const sink = createDiscordSink({
      webhookUrl: 'https://x', rateLimitMs: 30_000,
      alwaysSendPrefixes: ['wcpos.store.sale'],
    })
    sink(record(['wcpos', 'store', 'sale']))
    sink(record(['wcpos', 'store', 'sale']))
    expect((fetch as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(2)
  })

  it('still rate-limits a category that merely shares the prefix string', () => {
    const sink = createDiscordSink({
      webhookUrl: 'https://x', rateLimitMs: 30_000,
      alwaysSendPrefixes: ['wcpos.store.sale'],
    })
    // 'salefoo' is not 'sale' nor a dot-descendant of it — must NOT bypass.
    sink(record(['wcpos', 'store', 'salefoo']))
    sink(record(['wcpos', 'store', 'salefoo']))
    expect((fetch as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1)
  })

  it('registers the webhook POST with the Vercel request context so serverless does not drop it', () => {
    const ctx = stubVercelRequestContext()
    try {
      const sink = createDiscordSink({ webhookUrl: 'https://x' })
      sink(record(['wcpos', 'store']))
      expect(ctx.waitUntil).toHaveBeenCalledTimes(1)
    } finally {
      ctx.restore()
    }
  })
})
