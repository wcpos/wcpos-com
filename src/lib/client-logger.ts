'use client'

import { configure, getConsoleSink, getLogger } from '@logtape/logtape'
import * as Sentry from '@sentry/nextjs'
import type { LogLevel, LogRecord, Sink } from '@logtape/logtape'

let configured = false

/**
 * Client-side Loki sink
 * Sends logs to Loki via our API route (no CORS needed)
 */
function createClientLokiSink(): Sink {
  let batch: Array<[string, string]> = []
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

    if (batch.length >= 50) {
      flush()
    } else {
      scheduleFlush()
    }
  }
}

/**
 * Client-side Sentry sink
 * Sends errors to Sentry from the browser
 */
function createClientSentrySink(): Sink {
  return (record: LogRecord) => {
    // Only send errors and fatal logs to Sentry
    if (record.level !== 'error' && record.level !== 'fatal') {
      return
    }

    // Extract error object if present in properties
    const error = record.properties.error instanceof Error
      ? record.properties.error
      : undefined

    // Build message from log parts
    const message = record.message
      .map((part) => (typeof part === 'string' ? part : JSON.stringify(part)))
      .join('')

    // Prepare extra context
    const extra: Record<string, unknown> = {
      category: record.category.join('.'),
      level: record.level,
      timestamp: new Date(record.timestamp).toISOString(),
    }

    // Add all properties except error (we handle that separately)
    for (const [key, value] of Object.entries(record.properties)) {
      if (key !== 'error') {
        extra[key] = value
      }
    }

    // Send to Sentry
    if (error) {
      Sentry.captureException(error, {
        level: record.level === 'fatal' ? 'fatal' : 'error',
        extra,
        tags: {
          category: record.category.join('.'),
        },
      })
    } else {
      Sentry.captureMessage(message, {
        level: record.level === 'fatal' ? 'fatal' : 'error',
        extra,
        tags: {
          category: record.category.join('.'),
        },
      })
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
      sinks.sentry = createClientSentrySink()
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
      logger.error`Uncaught error: ${event.error || event.message}`
    })

    window.addEventListener('unhandledrejection', (event) => {
      const logger = getLogger(['wcpos', 'browser'])
      logger.error`Unhandled promise rejection: ${event.reason}`
    })
  } catch (err) {
    configured = false
    console.error('Failed to initialize client logging:', err)
  }
}

// Re-export logger creators for client-side use
export const clientLogger = getLogger(['wcpos', 'client'])
export { getLogger }
