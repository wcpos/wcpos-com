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
  /** Abort a push that hasn't settled after this long. Default 3s. */
  timeoutMs?: number
}

export function createLokiSink(options: LokiSinkOptions): Sink {
  const { url, apiKey, labels = {}, timeoutMs = 3000 } = options

  const endpoint = lokiPushEndpoint(url)
  const streamLabels = { job: 'wcpos', ...labels }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (apiKey) {
    headers['X-API-Key'] = apiKey
  }

  let pending: LokiLogEntry[] = []

  function flush(): Promise<void> {
    const entries = pending
    pending = []
    if (entries.length === 0) return Promise.resolve()

    return fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(buildLokiPayload(streamLabels, entries)),
      // Without a deadline, waitUntil would keep the (billed) function alive
      // for as long as a wedged Loki holds the connection open.
      signal: AbortSignal.timeout(timeoutMs),
    }).then(
      () => undefined,
      () => {
        // Loki unavailable — silently drop. Logs still go to console sink.
      }
    )
  }

  return (record: LogRecord) => {
    pending.push(formatLokiEntry(record))
    if (pending.length > 1) return // a flush is already scheduled for this tick

    // Coalesce every record logged in the same tick into one push. The
    // delivery promise is registered synchronously — while the Vercel request
    // context (if any) is still current — so the function stays alive until
    // the flush settles instead of freezing with the POST in flight. A
    // timer-based batch can't do this: serverless freezes before it fires.
    deliver(
      new Promise<void>((resolve) => {
        queueMicrotask(() => {
          void flush().then(resolve)
        })
      })
    )
  }
}
