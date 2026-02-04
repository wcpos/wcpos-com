import type { LogRecord, Sink } from '@logtape/logtape'

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

  const endpoint = url.replace(/\/$/, '') + '/loki/api/v1/push'
  let batch: Array<[string, string]> = []
  let flushTimer: ReturnType<typeof setTimeout> | null = null

  function flush() {
    if (batch.length === 0) return

    const entries = [...batch]
    batch = []

    const payload = {
      streams: [
        {
          stream: { job: 'wcpos', ...labels },
          values: entries,
        },
      ],
    }

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
    const timestampNs = (record.timestamp * 1_000_000).toString()

    const line = JSON.stringify({
      level: record.level,
      category: record.category.join('.'),
      message: record.message
        .map((part) => (typeof part === 'string' ? part : JSON.stringify(part)))
        .join(''),
      ...(Object.keys(record.properties).length > 0
        ? { properties: record.properties }
        : {}),
    })

    batch.push([timestampNs, line])

    if (batch.length >= batchSize) {
      flush()
    } else {
      scheduleFlush()
    }
  }
}
