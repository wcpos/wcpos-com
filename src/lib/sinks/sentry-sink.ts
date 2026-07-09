import type { LogRecord, Sink } from '@logtape/logtape'

import { stringifyLogPart } from './stringify-log-part'

interface SentrySinkOptions {
  ignoredCategoryPrefixes?: string[]
}

type SentryModule = typeof import('@sentry/nextjs')

// The Sentry SDK is imported on demand, the first time an error/fatal record
// actually reaches the sink. A static `import * as Sentry` here would pull the
// whole browser SDK into the initial client bundle of every page (client-logger
// imports this module unconditionally), paying ~10s of KB for a path that only
// runs when something breaks.
let sentryModule: Promise<SentryModule> | null = null

function loadSentry(): Promise<SentryModule> {
  if (!sentryModule) {
    sentryModule = import('@sentry/nextjs').catch((err) => {
      sentryModule = null
      throw err
    })
  }
  return sentryModule
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

    // Send to Sentry. LogTape sinks are synchronous, so delivery is
    // fire-and-forget; a failed SDK load must not throw into the logger.
    void loadSentry()
      .then((Sentry) => {
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
      })
      .catch(() => {
        // Swallows both SDK load failures and capture throws — a sink must
        // never throw into the logger; the record already went to the other
        // sinks.
      })
  }
}
