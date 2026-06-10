import 'server-only'

import { env } from '@/utils/env'

/**
 * Logs Service — Loki query API integration for the admin logs viewer.
 *
 * Reads from the same Loki instance the app pushes to (see
 * src/lib/sinks/loki-sink.ts and src/app/api/logs/route.ts), reusing the
 * LOKI_URL / LOKI_API_KEY env vars and the X-API-Key auth header.
 *
 * Both push paths label streams with `service="wcpos-com"` (the server sink
 * via instrumentation.ts, the browser proxy via /api/logs), so that is the
 * stream selector. Log lines are the JSON produced by formatLokiEntry():
 * `{ level, category, message, properties? }`.
 *
 * NOTE: this replaces the old database-backed stub. The previous ApiLog
 * fields (endpoint, platform, instance, appVersion, errorMessage) described
 * rows of a deleted Postgres table and do not exist in Loki log lines; the
 * interface now mirrors what the Loki sink actually writes. Offset-based
 * pagination (PaginatedLogs) is replaced by a time-range + limit model,
 * which is how Loki's query_range API works.
 */

export const LOG_LEVELS = ['debug', 'info', 'warning', 'error', 'fatal'] as const
export type LogLevel = (typeof LOG_LEVELS)[number]

export interface ApiLog {
  id: string
  level: LogLevel | 'unknown'
  category: string | null
  message: string
  /** Stream label: 'browser' for client logs, 'server' otherwise. */
  source: string
  environment: string | null
  properties: Record<string, unknown> | null
  createdAt: Date
}

export interface LogsQueryOptions {
  /** Filter to a single level. Omit for all levels. */
  level?: LogLevel
  /** How far back to query, in minutes. Default 60. */
  rangeMinutes?: number
  /** Max entries to return (newest first). Default 100. */
  limit?: number
}

export type LogsQueryResult =
  | { status: 'unconfigured' }
  | { status: 'error'; message: string }
  | {
      status: 'ok'
      logs: ApiLog[]
      rangeMinutes: number
      limit: number
      level: LogLevel | null
    }

interface LokiStream {
  stream: Record<string, string>
  values: Array<[timestampNs: string, line: string]>
}

interface LokiQueryRangeResponse {
  status: string
  data?: {
    resultType: string
    result: LokiStream[]
  }
}

const STREAM_SELECTOR = '{service="wcpos-com"}'

export function isLogQueryingConfigured(): boolean {
  return Boolean(env.LOKI_URL)
}

/**
 * Build the LogQL query string. Exported for tests.
 */
export function buildLogQuery(level?: LogLevel): string {
  if (!level) return STREAM_SELECTOR
  // Lines are JSON ({ level, category, message, ... }); parse and filter.
  return `${STREAM_SELECTOR} | json | level = "${level}"`
}

function isKnownLevel(value: unknown): value is LogLevel {
  return (
    typeof value === 'string' && (LOG_LEVELS as readonly string[]).includes(value)
  )
}

function mapLokiValue(
  stream: Record<string, string>,
  timestampNs: string,
  line: string,
  index: number
): ApiLog {
  let level: ApiLog['level'] = 'unknown'
  let category: string | null = null
  let message = line
  let properties: Record<string, unknown> | null = null

  try {
    const parsed = JSON.parse(line)
    if (parsed && typeof parsed === 'object') {
      if (isKnownLevel(parsed.level)) level = parsed.level
      if (typeof parsed.category === 'string') category = parsed.category
      if (typeof parsed.message === 'string') message = parsed.message
      if (parsed.properties && typeof parsed.properties === 'object') {
        properties = parsed.properties as Record<string, unknown>
      }
    }
  } catch {
    // Not JSON — keep the raw line as the message.
  }

  return {
    id: `${timestampNs}-${index}`,
    level,
    category,
    message,
    source: stream.source ?? 'server',
    environment: stream.environment ?? null,
    properties,
    createdAt: new Date(Number(timestampNs) / 1_000_000),
  }
}

/**
 * Query recent logs from Loki via GET /loki/api/v1/query_range.
 *
 * Never throws: configuration and fetch problems are reported through the
 * discriminated union so admin pages can render inline error states.
 */
export async function queryLogs(
  options: LogsQueryOptions = {}
): Promise<LogsQueryResult> {
  const { level, rangeMinutes = 60, limit = 100 } = options

  const baseUrl = env.LOKI_URL
  if (!baseUrl) {
    return { status: 'unconfigured' }
  }

  const endMs = Date.now()
  const startMs = endMs - rangeMinutes * 60 * 1000

  const params = new URLSearchParams({
    query: buildLogQuery(level),
    // Loki accepts unix epoch in nanoseconds.
    start: `${startMs}000000`,
    end: `${endMs}000000`,
    limit: String(limit),
    direction: 'backward',
  })

  const endpoint = `${baseUrl.replace(/\/$/, '')}/loki/api/v1/query_range?${params.toString()}`

  const headers: Record<string, string> = {}
  if (env.LOKI_API_KEY) {
    headers['X-API-Key'] = env.LOKI_API_KEY
  }

  try {
    const res = await fetch(endpoint, { headers })

    if (!res.ok) {
      return {
        status: 'error',
        message: `Loki query failed (${res.status})`,
      }
    }

    const json: LokiQueryRangeResponse = await res.json()

    if (json.status !== 'success' || !json.data) {
      return { status: 'error', message: 'Loki returned an unexpected response' }
    }

    const logs = json.data.result
      .flatMap((streamResult) =>
        streamResult.values.map(([timestampNs, line], index) =>
          mapLokiValue(streamResult.stream, timestampNs, line, index)
        )
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)

    return {
      status: 'ok',
      logs,
      rangeMinutes,
      limit,
      level: level ?? null,
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Loki query failed',
    }
  }
}
