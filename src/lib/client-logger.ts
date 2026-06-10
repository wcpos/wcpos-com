'use client'

import { configure, getConsoleSink, getLogger } from '@logtape/logtape'
import type { LogLevel, LogRecord, Sink } from '@logtape/logtape'
import { createSentrySink } from './sinks/sentry-sink'
import { formatLokiEntry, type LokiLogEntry } from './sinks/loki-format'

let configured = false

/**
 * Client-side Loki sink
 * Sends logs to Loki via our API route (no CORS needed)
 */
function createClientLokiSink(): Sink {
  let batch: LokiLogEntry[] = []
  let flushTimer: ReturnType<typeof setTimeout> | null = null

  function flush() {
    if (batch.length === 0) return

    const entries = [...batch]
    batch = []

    // Send to our API route which forwards to Loki
    fetch('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entries),
    }).catch(() => {
      // API unavailable — silently drop. Logs still go to console.
    })
  }

  function scheduleFlush() {
    if (flushTimer) return
    flushTimer = setTimeout(() => {
      flushTimer = null
      flush()
    }, 5000)
  }

  return (record: LogRecord) => {
    batch.push(formatLokiEntry(record))

    if (batch.length >= 50) {
      flush()
    } else {
      scheduleFlush()
    }
  }
}

/**
 * Initialize client-side logging
 * Call this once at app startup (e.g., in layout.tsx)
 */
export async function initializeClientLogging() {
  if (configured) return
  configured = true

  try {
    const sinks: Record<string, Sink> = {
      console: getConsoleSink(),
    }

    // Always add Loki sink (sends via API route)
    sinks.loki = createClientLokiSink()

    // Add Sentry sink if DSN is configured
    const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN
    if (sentryDsn) {
      sinks.sentry = createSentrySink()
    }

    // Determine log level (default to 'error' in production, 'debug' in development)
    const logLevel: LogLevel = (process.env.NEXT_PUBLIC_LOG_LEVEL ||
      (process.env.NODE_ENV === 'production' ? 'error' : 'debug')) as LogLevel

    const sinkNames = [
      'console',
      'loki',
      ...(sentryDsn ? ['sentry'] : []),
    ]

    await configure({
      sinks,
      loggers: [
        {
          category: ['wcpos'],
          lowestLevel: logLevel,
          sinks: sinkNames,
        },
      ],
    })

    // Setup global error handlers
    window.addEventListener('error', (event) => {
      const logger = getLogger(['wcpos', 'browser'])
      logger.error('Uncaught error', { error: event.error || new Error(event.message) })
    })

    window.addEventListener('unhandledrejection', (event) => {
      const logger = getLogger(['wcpos', 'browser'])
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason))
      logger.error('Unhandled promise rejection', { error })
    })
  } catch (err) {
    configured = false
    console.error('Failed to initialize client logging:', err)
  }
}

// Re-export logger creators for client-side use
export const clientLogger = getLogger(['wcpos', 'client'])
export { getLogger }
