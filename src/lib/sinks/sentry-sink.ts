import type { LogRecord, Sink } from '@logtape/logtape'
import * as Sentry from '@sentry/nextjs'

/**
 * Sentry sink for LogTape
 * Sends error and fatal level logs to Sentry with full context
 */
export function createSentrySink(): Sink {
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
