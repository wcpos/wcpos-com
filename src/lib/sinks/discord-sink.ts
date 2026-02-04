import type { LogRecord, Sink } from '@logtape/logtape'

interface DiscordSinkOptions {
  webhookUrl: string
  username?: string
  rateLimitMs?: number
}

export function createDiscordSink(options: DiscordSinkOptions): Sink {
  const {
    webhookUrl,
    username = 'WCPOS Logger',
    rateLimitMs = 30_000,
  } = options

  const lastSent = new Map<string, number>()

  const safeStringify = (value: unknown) => {
    try {
      return typeof value === 'string' ? value : JSON.stringify(value)
    } catch {
      return '[unserializable]'
    }
  }

  const colors: Record<string, number> = {
    error: 15158332, // red
    fatal: 10038562, // dark red
  }

  return (record: LogRecord) => {
    if (record.level !== 'error' && record.level !== 'fatal') return

    const category = record.category.join('.')
    const now = Date.now()
    const last = lastSent.get(category) ?? 0
    if (now - last < rateLimitMs) return

    lastSent.set(category, now)

    const message = record.message.map(safeStringify).join('')

    const embed = {
      title: `${record.level.toUpperCase()}: ${category}`,
      description: message.slice(0, 2000),
      color: colors[record.level] ?? colors.error,
      timestamp: new Date(record.timestamp).toISOString(),
      fields: Object.entries(record.properties)
        .slice(0, 5)
        .map(([name, value]) => ({
          name,
          value: safeStringify(value).slice(0, 1024),
          inline: true,
        })),
    }

    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, embeds: [embed] }),
    }).catch(() => {
      // Discord unavailable — silently drop
    })
  }
}
