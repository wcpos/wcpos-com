import { describe, it, expect } from 'vitest'
import type { LogRecord } from '@logtape/logtape'

import {
  buildLokiPayload,
  formatLokiEntry,
  lokiPushEndpoint,
  type LokiLogEntry,
} from './loki-format'

function buildRecord(overrides: Partial<LogRecord> = {}): LogRecord {
  return {
    level: 'info',
    category: ['wcpos', 'client'],
    message: ['hello world'],
    rawMessage: 'hello world',
    timestamp: 1700000000000,
    properties: {},
    ...overrides,
  } as LogRecord
}

describe('formatLokiEntry', () => {
  it('converts the timestamp from ms to a nanosecond string', () => {
    const [timestampNs] = formatLokiEntry(buildRecord())
    expect(timestampNs).toBe('1700000000000000000')
  })

  it('serializes level, category and message into a JSON line', () => {
    const [, line] = formatLokiEntry(buildRecord())
    expect(JSON.parse(line)).toEqual({
      level: 'info',
      category: 'wcpos.client',
      message: 'hello world',
    })
  })

  it('stringifies non-string message parts', () => {
    const [, line] = formatLokiEntry(
      buildRecord({ message: ['count: ', 42, ' items'] })
    )
    expect(JSON.parse(line).message).toBe('count: 42 items')
  })

  it('includes properties only when present', () => {
    const [, withProps] = formatLokiEntry(
      buildRecord({ properties: { userId: 'u_1' } })
    )
    expect(JSON.parse(withProps).properties).toEqual({ userId: 'u_1' })

    const [, withoutProps] = formatLokiEntry(buildRecord())
    expect(JSON.parse(withoutProps)).not.toHaveProperty('properties')
  })
})

describe('buildLokiPayload', () => {
  it('wraps labels and entries in a single stream', () => {
    const entries: LokiLogEntry[] = [
      ['1700000000000000000', '{"message":"a"}'],
      ['1700000001000000000', '{"message":"b"}'],
    ]

    expect(buildLokiPayload({ job: 'wcpos', env: 'test' }, entries)).toEqual({
      streams: [
        {
          stream: { job: 'wcpos', env: 'test' },
          values: entries,
        },
      ],
    })
  })
})

describe('lokiPushEndpoint', () => {
  it('appends the push path to the base URL', () => {
    expect(lokiPushEndpoint('https://loki.example.com')).toBe(
      'https://loki.example.com/loki/api/v1/push'
    )
  })

  it('strips a trailing slash before appending', () => {
    expect(lokiPushEndpoint('https://loki.example.com/')).toBe(
      'https://loki.example.com/loki/api/v1/push'
    )
  })
})
