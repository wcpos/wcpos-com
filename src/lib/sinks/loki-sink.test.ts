import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLokiSink } from './loki-sink'
import type { LogRecord } from '@logtape/logtape'

const REQUEST_CONTEXT = Symbol.for('@vercel/request-context')

type GlobalWithContext = { [REQUEST_CONTEXT]?: unknown }

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

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  delete (globalThis as GlobalWithContext)[REQUEST_CONTEXT]
})

const mockedFetch = () => fetch as ReturnType<typeof vi.fn>

describe('createLokiSink batching (long-lived runtimes)', () => {
  it('holds records until the flush timer fires', () => {
    const sink = createLokiSink({ url: 'https://loki', flushIntervalMs: 5000 })
    sink(record('one'))
    sink(record('two'))
    expect(mockedFetch()).not.toHaveBeenCalled()

    vi.advanceTimersByTime(5000)
    expect(mockedFetch()).toHaveBeenCalledTimes(1)
  })

  it('flushes as soon as the batch is full', () => {
    const sink = createLokiSink({ url: 'https://loki', batchSize: 2 })
    sink(record('one'))
    expect(mockedFetch()).not.toHaveBeenCalled()
    sink(record('two'))
    expect(mockedFetch()).toHaveBeenCalledTimes(1)
  })
})

describe('createLokiSink immediate mode (serverless)', () => {
  it('pushes every record without waiting for timer or batch size', () => {
    const sink = createLokiSink({ url: 'https://loki', immediate: true })
    sink(record('one'))
    expect(mockedFetch()).toHaveBeenCalledTimes(1)
    sink(record('two'))
    expect(mockedFetch()).toHaveBeenCalledTimes(2)
  })

  it('registers the push with the Vercel request context', () => {
    const waitUntil = vi.fn()
    ;(globalThis as GlobalWithContext)[REQUEST_CONTEXT] = {
      get: () => ({ waitUntil }),
    }

    const sink = createLokiSink({ url: 'https://loki', immediate: true })
    sink(record('one'))

    expect(waitUntil).toHaveBeenCalledTimes(1)
  })
})
