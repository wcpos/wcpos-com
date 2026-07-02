import { configure, getConsoleSink } from '@logtape/logtape'
import { createLokiSink } from '@/lib/sinks/loki-sink'
import { createDiscordSink } from '@/lib/sinks/discord-sink'
import { createSentrySink } from '@/lib/sinks/sentry-sink'
import { createEmailSink } from '@/lib/sinks/email-sink'

let configured = false

export async function register() {
  if (configured) return
  configured = true

  try {
    const sinks: Record<string, ReturnType<typeof getConsoleSink>> = {
      console: getConsoleSink(),
    }

    const lokiUrl = process.env.LOKI_URL
    if (lokiUrl) {
      sinks.loki = createLokiSink({
        url: lokiUrl,
        apiKey: process.env.LOKI_API_KEY,
        labels: {
          service: 'wcpos-com',
          // NODE_ENV is 'production' on Vercel previews too — VERCEL_ENV is
          // the value that distinguishes production/preview/development.
          environment:
            process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
        },
      })
    }

    const discordUrl = process.env.DISCORD_WEBHOOK_URL
    if (discordUrl) {
      sinks.discord = createDiscordSink({
        webhookUrl: discordUrl,
        // Categories that bypass the 30s rate limit entirely: money-at-risk
        // sale events, and download-delivery failures (a paying customer who
        // can't download must always page, never be throttled away).
        alwaysSendPrefixes: ['wcpos.store.sale', 'wcpos.license.download'],
      })
    }

    // Add Sentry sink if DSN is configured
    const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
    if (sentryDsn) {
      sinks.sentry = createSentrySink({
        ignoredCategoryPrefixes: ['wcpos.store.sale.routine'],
      })
    }

    // Email sink for the immediate-attention tier (fatal only). A missed Discord
    // ping can't then hide a paid-but-no-license / broken-checkout incident.
    const alertEmailKey = process.env.RESEND_API_KEY
    const alertEmailTo = process.env.ALERT_EMAIL_TO
    const emailConfigured = Boolean(alertEmailKey && alertEmailTo)
    if (emailConfigured) {
      sinks.email = createEmailSink({
        apiKey: alertEmailKey!,
        to: alertEmailTo!,
        from: process.env.ALERT_EMAIL_FROM || 'WCPOS Alerts <noreply@wcpos.com>',
      })
    }

    // Single logger entry for all sinks — Discord, Sentry and email sinks filter by level internally
    const sinkNames = [
      'console',
      ...(lokiUrl ? ['loki'] : []),
      ...(discordUrl ? ['discord'] : []),
      ...(sentryDsn ? ['sentry'] : []),
      ...(emailConfigured ? ['email'] : []),
    ]

    await configure({
      sinks,
      loggers: [
        {
          category: ['wcpos'],
          lowestLevel: 'debug',
          sinks: sinkNames,
        },
      ],
    })
  } catch (err) {
    configured = false
    throw err
  }
}
