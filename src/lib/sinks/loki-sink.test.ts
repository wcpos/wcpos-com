import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLokiSink } from './loki-sink'
import { stubVercelRequestContext } from '@/test/vercel-request-context'
import type { LogRecord } from '@logtape/logtape'

function record(message: string): LogRecord {
  return {
    category: ['wcpos', 'test'],
    level: 'error',
    message: [message],
    properties: {},
    timestamp: 0,
    rawMessage: message,
  } as unknown as LogRecord
}

// Let queued microtasks (the sink's coalesced flush) run.
const nextTick = () => Promise.resolve()

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const mockedFetch = () => fetch as ReturnType<typeof vi.fn>

describe('createLokiSink same-tick coalescing', () => {
  it('coalesces records logged in the same tick into one push', async () => {
    const sink = createLokiSink({ url: 'https://loki' })
    sink(record('one'))
    sink(record('two'))
    expect(mockedFetch()).not.toHaveBeenCalled()

    await nextTick()
    expect(mockedFetch()).toHaveBeenCalledTimes(1)
    const body = JSON.parse(mockedFetch().mock.calls[0][1].body as string)
    expect(body.streams[0].values).toHaveLength(2)
  })

  it('pushes records from separate ticks separately', async () => {
    const sink = createLokiSink({ url: 'https://loki' })
    sink(record('one'))
    await nextTick()
    sink(record('two'))
    await nextTick()
    expect(mockedFetch()).toHaveBeenCalledTimes(2)
  })

  it('bounds each push with an abort timeout', async () => {
    const sink = createLokiSink({ url: 'https://loki' })
    sink(record('one'))
    await nextTick()
    const init = mockedFetch().mock.calls[0][1] as RequestInit
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('swallows a failed push', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('down'))))
    const sink = createLokiSink({ url: 'https://loki' })
    expect(() => sink(record('one'))).not.toThrow()
    await nextTick()
    await nextTick()
  })
})

describe('createLokiSink serverless delivery', () => {
  it('registers one delivery per coalesced flush with the Vercel request context', async () => {
    const ctx = stubVercelRequestContext()
    try {
      const sink = createLokiSink({ url: 'https://loki' })
      sink(record('one'))
      sink(record('two'))

      // Registered synchronously, while the request context is still current.
      expect(ctx.waitUntil).toHaveBeenCalledTimes(1)

      // The delivered promise resolves once the flush settles.
      await nextTick()
      await expect(ctx.waitUntil.mock.calls[0][0]).resolves.toBeUndefined()
      expect(mockedFetch()).toHaveBeenCalledTimes(1)
    } finally {
      ctx.restore()
    }
  })
})
