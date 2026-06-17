import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { LogRecord } from '@logtape/logtape'
import { createEmailSink } from './email-sink'

function record(overrides: Partial<LogRecord> = {}): LogRecord {
  return {
    category: ['wcpos', 'store', 'sale'],
    level: 'fatal',
    message: ['Checkout failure (money at risk): order_pending'],
    properties: {},
    timestamp: 1_700_000_000_000,
    ...overrides,
  } as LogRecord
}

describe('createEmailSink', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn(() => Promise.resolve({ ok: true } as Response))
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('emails on fatal, hitting the Resend API with from/to/subject', () => {
    const sink = createEmailSink({
      apiKey: 'key',
      to: 'owner@example.com',
      from: 'Alerts <a@b.com>',
    })
    sink(record())

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.resend.com/emails')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer key')
    const body = JSON.parse(init.body as string)
    expect(body.from).toBe('Alerts <a@b.com>')
    expect(body.to).toEqual(['owner@example.com'])
    expect(body.subject).toContain('wcpos.store.sale')
  })

  it('does NOT email on non-fatal levels', () => {
    const sink = createEmailSink({ apiKey: 'k', to: 'o@e.com', from: 'a@b.com' })
    sink(record({ level: 'error' }))
    sink(record({ level: 'warning' }))
    sink(record({ level: 'info' }))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('splits a comma-separated recipient list', () => {
    const sink = createEmailSink({ apiKey: 'k', to: 'a@x.com, b@x.com', from: 'a@b.com' })
    sink(record())
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.to).toEqual(['a@x.com', 'b@x.com'])
  })

  it('throttles repeated fatals in the same category', () => {
    const sink = createEmailSink({ apiKey: 'k', to: 'o@e.com', from: 'a@b.com' })
    sink(record())
    sink(record())
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('escapes HTML in the message so log content cannot inject markup', () => {
    const sink = createEmailSink({ apiKey: 'k', to: 'o@e.com', from: 'a@b.com' })
    sink(record({ message: ['<img src=x onerror=alert(1)>'] }))
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.html).not.toContain('<img src=x')
    expect(body.html).toContain('&lt;img src=x')
  })

  it('is a no-op when there are no recipients', () => {
    const sink = createEmailSink({ apiKey: 'k', to: '', from: 'a@b.com' })
    sink(record())
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
