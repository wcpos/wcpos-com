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

  it('renders interpolated Error objects with their message, not {}', () => {
    const sink = createDiscordSink({ webhookUrl: 'https://x' })
    sink({
      category: ['wcpos', 'auth'], level: 'error',
      message: ['Failed to initiate OAuth: ', new Error('Medusa returned 500')],
      properties: {}, timestamp: 0, rawMessage: 'Failed to initiate OAuth: {}',
    } as unknown as LogRecord)
    const body = JSON.parse(
      (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
    )
    expect(body.embeds[0].description).toContain('Medusa returned 500')
    expect(body.embeds[0].description).not.toContain('{}')
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
