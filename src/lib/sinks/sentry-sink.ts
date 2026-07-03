import type { LogRecord, Sink } from '@logtape/logtape'
import * as Sentry from '@sentry/nextjs'

import { stringifyLogPart } from './stringify-log-part'

interface SentrySinkOptions {
  ignoredCategoryPrefixes?: string[]
}

/**
 * Sentry sink for LogTape
 * Sends error and fatal level logs to Sentry with full context
 */
export function createSentrySink(options: SentrySinkOptions = {}): Sink {
  const { ignoredCategoryPrefixes = [] } = options

  return (record: LogRecord) => {
    // Only send errors and fatal logs to Sentry
    if (record.level !== 'error' && record.level !== 'fatal') {
      return
    }

    const category = record.category.join('.')
    if (ignoredCategoryPrefixes.some((p) => category === p || category.startsWith(`${p}.`))) {
      return
    }

    // Extract error object if present in properties or interpolated into the
    // message template (logger.error`...: ${error}` puts it in message parts).
    const error =
      record.properties.error instanceof Error
        ? record.properties.error
        : record.message.find((part): part is Error => part instanceof Error)

    // Build message from log parts
    const message = record.message.map(stringifyLogPart).join('')

    // Prepare extra context
    const extra: Record<string, unknown> = {
      category,
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
        extra: { ...extra, message },
        tags: {
          category,
        },
      })
    } else {
      Sentry.captureMessage(message, {
        level: record.level === 'fatal' ? 'fatal' : 'error',
        extra,
        tags: {
          category,
        },
      })
    }
  }
}
