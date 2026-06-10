import type { LogRecord, Sink } from '@logtape/logtape'
import {
  buildLokiPayload,
  formatLokiEntry,
  lokiPushEndpoint,
  type LokiLogEntry,
} from './loki-format'

interface LokiSinkOptions {
  url: string
  apiKey?: string
  labels?: Record<string, string>
  batchSize?: number
  flushIntervalMs?: number
}

export function createLokiSink(options: LokiSinkOptions): Sink {
  const {
    url,
    apiKey,
    labels = {},
    batchSize = 100,
    flushIntervalMs = 5000,
  } = options

  const endpoint = lokiPushEndpoint(url)
  let batch: LokiLogEntry[] = []
  let flushTimer: ReturnType<typeof setTimeout> | null = null

  function flush() {
    if (batch.length === 0) return

    const entries = [...batch]
    batch = []

    const payload = buildLokiPayload({ job: 'wcpos', ...labels }, entries)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (apiKey) {
      headers['X-API-Key'] = apiKey
    }

    fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    }).catch(() => {
      // Loki unavailable — silently drop. Logs still go to console sink.
    })
  }

  function scheduleFlush() {
    if (flushTimer) return
    flushTimer = setTimeout(() => {
      flushTimer = null
      flush()
    }, flushIntervalMs)
  }

  return (record: LogRecord) => {
    batch.push(formatLokiEntry(record))

    if (batch.length >= batchSize) {
      flush()
    } else {
      scheduleFlush()
    }
  }
}
