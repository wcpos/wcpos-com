import { configure, getConsoleSink } from '@logtape/logtape'
import { createLokiSink } from '@/lib/sinks/loki-sink'
import { createDiscordSink } from '@/lib/sinks/discord-sink'

let configured = false

export async function register() {
  if (configured) return
  configured = true

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

  // Single logger entry for all sinks — Discord sink filters for error/fatal internally
  const sinkNames = [
    'console',
    ...(lokiUrl ? ['loki'] : []),
    ...(discordUrl ? ['discord'] : []),
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
}
