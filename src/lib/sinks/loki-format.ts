import type { LogRecord } from '@logtape/logtape'

import { stringifyLogPart } from './stringify-log-part'

/**
 * Pure helpers for building Loki push API payloads.
 *
 * Shared by the server Loki sink (src/lib/sinks/loki-sink.ts), the client
 * logger (src/lib/client-logger.ts) and the /api/logs proxy route so the
 * line format stays identical regardless of where a log originates.
 *
 * Transport intentionally lives with the callers: the browser posts entries
 * to /api/logs (LOKI_API_KEY is a server secret), while the server pushes
 * directly to Loki.
 */

/** A Loki stream value: [unix timestamp in nanoseconds, log line]. */
export type LokiLogEntry = [timestampNs: string, line: string]

/**
 * Convert a LogTape record into a Loki value tuple with a JSON log line.
 */
export function formatLokiEntry(record: LogRecord): LokiLogEntry {
  const timestampNs = (record.timestamp * 1_000_000).toString()

  const line = JSON.stringify({
    level: record.level,
    category: record.category.join('.'),
    message: record.message.map(stringifyLogPart).join(''),
    ...(Object.keys(record.properties).length > 0
      ? { properties: record.properties }
      : {}),
  })

  return [timestampNs, line]
}

/**
 * Build a Loki push API payload (single stream) for a batch of entries.
 */
export function buildLokiPayload(
  labels: Record<string, string>,
  values: LokiLogEntry[]
): { streams: Array<{ stream: Record<string, string>; values: LokiLogEntry[] }> } {
  return {
    streams: [
      {
        stream: labels,
        values,
      },
    ],
  }
}

/**
 * Resolve the Loki push endpoint from a base URL.
 */
export function lokiPushEndpoint(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '') + '/loki/api/v1/push'
}
