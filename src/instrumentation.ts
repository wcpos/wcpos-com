import { configure, getConsoleSink } from '@logtape/logtape'
import { createLokiSink } from '@/lib/sinks/loki-sink'
import { createDiscordSink } from '@/lib/sinks/discord-sink'
import { createSentrySink } from '@/lib/sinks/sentry-sink'

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
          environment: process.env.NODE_ENV ?? 'development',
        },
      })
    }

    const discordUrl = process.env.DISCORD_WEBHOOK_URL
    if (discordUrl) {
      sinks.discord = createDiscordSink({
        webhookUrl: discordUrl,
      })
    }

    // Add Sentry sink if DSN is configured
    const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
    if (sentryDsn) {
      sinks.sentry = createSentrySink()
    }

    // Single logger entry for all sinks — Discord and Sentry sinks filter for error/fatal internally
    const sinkNames = [
      'console',
      ...(lokiUrl ? ['loki'] : []),
      ...(discordUrl ? ['discord'] : []),
      ...(sentryDsn ? ['sentry'] : []),
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
