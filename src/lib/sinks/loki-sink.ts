import type { LogRecord, Sink } from '@logtape/logtape'
import {
  buildLokiPayload,
  formatLokiEntry,
  lokiPushEndpoint,
  type LokiLogEntry,
} from './loki-format'
import { deliver } from './deliver'

interface LokiSinkOptions {
  url: string
  apiKey?: string
  labels?: Record<string, string>
  batchSize?: number
  flushIntervalMs?: number
  /**
   * Push every record immediately instead of batching. Required on serverless
   * runtimes (Vercel): the function freezes after the response is sent, so a
   * timer-based flush never fires and batched entries are dropped.
   */
  immediate?: boolean
}

export function createLokiSink(options: LokiSinkOptions): Sink {
  const {
    url,
    apiKey,
    labels = {},
    batchSize = 100,
    flushIntervalMs = 5000,
    immediate = false,
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

    deliver(
      fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      }).catch(() => {
        // Loki unavailable — silently drop. Logs still go to console sink.
      })
    )
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

    if (immediate || batch.length >= batchSize) {
      flush()
    } else {
      scheduleFlush()
    }
  }
}
